import { createPublicKey, verify } from 'crypto';
import os from 'os';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { LicensePayload, LicenseState, LicenseValidationResult } from '../../../shared/types';
import { getDatabase } from '../../database/index';

// Ed25519 public key for license verification
const VENDOR_PUBLIC_PEM = `
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAUPQrh9QI2CTih4ooMnK6EnQaapAfu7zEK5jQJAxOpNA=
-----END PUBLIC KEY-----
`.trim();

/**
 * Convert base64url to Buffer
 */
function b64uToBuf(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

/** Cached fingerprint — hardware UUID never changes at runtime */
let cachedFingerprint: string | null = null;

/**
 * Get the platform-specific hardware UUID.
 * - Windows: motherboard UUID via `wmic csproduct get UUID`
 * - macOS:   Hardware UUID via `ioreg`
 * - Linux:   /etc/machine-id (fallback)
 *
 * These are stable across reboots, sleep/wake, VPN/Docker changes,
 * hostname renames, and memory fluctuations.
 */
function getHardwareUUID(): string {
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      const output = execSync('wmic csproduct get UUID', {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true,
      });
      const uuid = output.split('\n').map(l => l.trim()).filter(l => l && l !== 'UUID')[0];
      if (uuid && uuid !== 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF') {
        return uuid.toLowerCase();
      }
    } else if (platform === 'darwin') {
      const output = execSync(
        'ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID',
        { encoding: 'utf8', timeout: 5000 },
      );
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (match?.[1]) {
        return match[1].toLowerCase();
      }
    } else {
      // Linux fallback
      const id = execSync('cat /etc/machine-id', {
        encoding: 'utf8',
        timeout: 5000,
      }).trim();
      if (id) return id;
    }
  } catch {
    // Fall through to OS-based fallback
  }

  // Last-resort fallback: platform + arch + cpu model (still better than
  // the old volatile approach, but should rarely be hit)
  const cpus = os.cpus();
  return [platform, os.arch(), cpus[0]?.model || 'unknown'].join('|');
}

/**
 * Generate a stable device fingerprint from the hardware UUID.
 * The result is deterministic and survives reboots, sleep/wake cycles,
 * VPN/Docker network changes, hostname renames, and memory fluctuations.
 */
export function getDeviceFingerprint(): string {
  if (cachedFingerprint) return cachedFingerprint;

  const hwid = getHardwareUUID();
  cachedFingerprint = createHash('sha256').update(hwid).digest('hex').slice(0, 32);
  return cachedFingerprint;
}

// --- DB persistence helpers ---

interface StoredLicensePayload {
  fingerprint: string;
  maxAccounts: number;
  expiresAt: string;
}

function ensureLicenseTable(): void {
  try {
    const db = getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS license_store (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch {
    // DB might not be initialized yet during early calls
  }
}

function dbGet(key: string): unknown | null {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM license_store WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}

function dbSet(key: string, value: unknown): void {
  try {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO license_store (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, JSON.stringify(value));
  } catch {
    // Silently fail if DB not ready
  }
}

export class LicenseService {
  private licenseState: LicenseState = {
    isValid: false,
    maxAccounts: 0,
  };

  private storedPayload: StoredLicensePayload | null = null;

  /**
   * Initialize: create table and load persisted license from DB
   */
  init(): void {
    ensureLicenseTable();
    const saved = dbGet('licensePayload') as StoredLicensePayload | null;
    if (saved) {
      this.storedPayload = saved;
      this.validateStoredPayload();
    }
  }

  /**
   * Activate license from raw license string (base64url payload.base64url signature)
   * This verifies the Ed25519 signature and persists the payload to DB.
   */
  activateLicense(licenseString: string): LicenseState {
    try {
      // Split license into payload and signature
      const [payloadB64u, sigB64u] = licenseString.split('.');
      if (!payloadB64u || !sigB64u) {
        this.updateState(false, 'Malformed license format');
        return this.licenseState;
      }

      // Decode payload
      const payloadJson = b64uToBuf(payloadB64u).toString('utf8');
      const payload = JSON.parse(payloadJson) as {
        fp: string;
        numberOfAccount: number;
        exp: string;
        nbf?: string;
      };

      // Verify signature using Ed25519
      const pub = createPublicKey(VENDOR_PUBLIC_PEM);
      const signature = b64uToBuf(sigB64u);
      const isValidSig = verify(null, Buffer.from(payloadJson), pub, signature);

      if (!isValidSig) {
        this.updateState(false, 'Invalid signature');
        return this.licenseState;
      }

      // Signature valid — persist payload to DB
      this.storedPayload = {
        fingerprint: payload.fp,
        maxAccounts: payload.numberOfAccount,
        expiresAt: payload.exp,
      };

      dbSet('licensePayload', this.storedPayload);
      dbSet('licenseValid', true);

      // Validate expiry + fingerprint
      this.validateStoredPayload();
      return this.licenseState;
    } catch (error) {
      this.updateState(false, 'Verification error');
      return this.licenseState;
    }
  }

  /**
   * Validate stored payload against current device and time
   */
  validateStoredPayload(): LicenseValidationResult {
    if (!this.storedPayload) {
      return { isValid: false, reason: 'No license found' };
    }

    const now = Date.now();
    const currentFingerprint = getDeviceFingerprint();

    // Check expiration
    if (this.storedPayload.expiresAt) {
      const expTime = new Date(this.storedPayload.expiresAt).getTime();
      if (now > expTime) {
        this.updateState(false, 'License expired');
        return { isValid: false, reason: 'License expired' };
      }
    }

    // Check device binding
    if (this.storedPayload.fingerprint !== currentFingerprint) {
      this.updateState(false, 'Device mismatch');
      return { isValid: false, reason: 'Device mismatch' };
    }

    // License is valid
    this.updateState(true, undefined, this.storedPayload.maxAccounts, this.storedPayload.expiresAt);

    return {
      isValid: true,
      payload: this.storedPayload,
    };
  }

  /**
   * Validate license payload received from renderer (legacy method)
   */
  validatePayload(payload: LicensePayload): LicenseState {
    this.storedPayload = {
      fingerprint: payload.fingerprint,
      maxAccounts: payload.maxAccounts,
      expiresAt: payload.expiresAt,
    };

    dbSet('licensePayload', this.storedPayload);

    this.validateStoredPayload();
    return this.licenseState;
  }

  /**
   * Get current license state — re-validates from DB on each call
   */
  getState(): LicenseState {
    // If no payload in memory, try loading from DB
    if (!this.storedPayload) {
      const saved = dbGet('licensePayload') as StoredLicensePayload | null;
      if (saved) {
        this.storedPayload = saved;
      }
    }

    if (this.storedPayload) {
      this.validateStoredPayload();
    }
    return { ...this.licenseState, fingerprint: getDeviceFingerprint() };
  }

  /**
   * Get device fingerprint
   */
  getFingerprint(): string {
    return getDeviceFingerprint();
  }

  /**
   * Check if license is valid
   */
  isValid(): boolean {
    if (this.storedPayload) {
      this.validateStoredPayload();
    }
    return this.licenseState.isValid;
  }

  /**
   * Clear stored license
   */
  clearLicense(): void {
    this.storedPayload = null;
    this.licenseState = {
      isValid: false,
      maxAccounts: 0,
    };
    try {
      const db = getDatabase();
      db.prepare('DELETE FROM license_store WHERE key IN (?, ?)').run('licensePayload', 'licenseValid');
    } catch {
      // ignore
    }
  }

  private updateState(
    isValid: boolean,
    reason?: string,
    maxAccounts?: number,
    expiresAt?: string
  ): void {
    this.licenseState = {
      isValid,
      reason,
      maxAccounts: maxAccounts ?? 0,
      expiresAt,
      fingerprint: getDeviceFingerprint(),
    };
  }
}

export const licenseService = new LicenseService();
