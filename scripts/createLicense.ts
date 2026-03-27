/**
 * License Generation Script
 *
 * Usage: npx ts-node scripts/createLicense.ts <fingerprint> <maxAccounts> <expiresAt>
 *
 * Example: npx ts-node scripts/createLicense.ts abc123def456 5 2025-12-31
 */

import { createPrivateKey, sign } from 'crypto';

// Ed25519 private key (KEEP SECRET)
const VENDOR_PRIVATE_PEM = `
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIKvMC3qfrrL+rVDMEi7ziDWMQkQSXphYm6lLFXi6uoov
-----END PRIVATE KEY-----
`.trim();

function bufToB64u(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function createLicense(
  fingerprint: string,
  numberOfAccount: number,
  exp: string
): string {
  const payload = {
    fp: fingerprint,
    numberOfAccount,
    exp,
    iat: new Date().toISOString(),
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64u = bufToB64u(Buffer.from(payloadJson, 'utf8'));

  // Sign with Ed25519
  const privateKey = createPrivateKey(VENDOR_PRIVATE_PEM);
  const signature = sign(null, Buffer.from(payloadJson), privateKey);
  const signatureB64u = bufToB64u(signature);

  return `${payloadB64u}.${signatureB64u}`;
}

// CLI
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Usage: npx ts-node scripts/createLicense.ts <fingerprint> <maxAccounts> <expiresAt>');
  console.log('Example: npx ts-node scripts/createLicense.ts abc123def456 5 2025-12-31');
  process.exit(1);
}

const [fingerprint, maxAccountsStr, expiresAt] = args;
const maxAccounts = parseInt(maxAccountsStr, 10);

if (isNaN(maxAccounts) || maxAccounts < 1) {
  console.error('maxAccounts must be a positive number');
  process.exit(1);
}

const license = createLicense(fingerprint, maxAccounts, expiresAt);

console.log('\n=== License Generated ===\n');
console.log('Fingerprint:', fingerprint);
console.log('Max Accounts:', maxAccounts);
console.log('Expires:', expiresAt);
console.log('\nLicense Key:\n');
console.log(license);
console.log('\n=========================\n');
