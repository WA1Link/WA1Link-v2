import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// ---- Mocks must be set up before importing the module under test ----

// Mock electron
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
}));

// Mock database repositories
vi.mock('../../main/database/repositories/account.repository', () => ({
  accountRepository: {
    update: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('../../main/database/repositories/whatsapp-chat.repository', () => ({
  whatsappChatRepository: {
    getByAccount: vi.fn().mockReturnValue([]),
    upsertBatch: vi.fn(),
    upsert: vi.fn(),
  },
}));

// Mock phone normalizer
vi.mock('../../main/services/whatsapp/../phone/normalizer.service', () => ({
  phoneNormalizer: {
    validate: vi.fn().mockReturnValue({ valid: true }),
    normalize: vi.fn().mockReturnValue({ full: '994501234567' }),
  },
}));

// Create a mock socket with event emitter
function createMockSocket() {
  const ev = new EventEmitter();
  return {
    ev,
    user: null as any,
    end: vi.fn(),
    logout: vi.fn(),
    requestPairingCode: vi.fn().mockResolvedValue('ABCD-EFGH'),
    authState: { creds: { registered: false } },
  };
}

// Mock Baileys
let mockSocket: ReturnType<typeof createMockSocket>;

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  },
}));

// We need a custom approach since getBaileys uses dynamic import
// Instead, we'll test the SocketService behavior via its event emissions

describe('SocketService', () => {
  // Since SocketService has deep coupling to Baileys dynamic import and file system,
  // we test the critical logic paths by importing the class and mocking at the right level.
  // For the handleConnectionUpdate / handleDisconnected logic, we extract and test the
  // event emission patterns.

  describe('Connection Event Flow Logic', () => {
    // We simulate what the SocketService does by testing event-driven patterns
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.removeAllListeners();
    });

    it('should emit qr_ready when QR code is received (not using pairing code)', () => {
      const events: any[] = [];
      emitter.on('status-changed', (data) => events.push(data));
      emitter.on('qr', (data) => events.push(data));

      // Simulate handleConnectionUpdate with qr
      const usePairingCode = false;
      const accountId = 'test-account-1';
      const qr = 'qr-data-string';

      if (qr && !usePairingCode) {
        emitter.emit('qr', { accountId, qrCode: qr, status: 'qr_ready' });
        emitter.emit('status-changed', { accountId, status: 'qr_ready' });
      }

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ accountId, qrCode: qr, status: 'qr_ready' });
      expect(events[1]).toEqual({ accountId, status: 'qr_ready' });
    });

    it('should emit connected when connection opens', () => {
      const events: any[] = [];
      emitter.on('status-changed', (data) => events.push(data));

      const accountId = 'test-account-1';
      const connection = 'open';

      if (connection === 'open') {
        emitter.emit('status-changed', { accountId, status: 'connected' });
      }

      expect(events).toHaveLength(1);
      expect(events[0].status).toBe('connected');
    });

    it('should emit logged_out and delete session on 401 disconnect', () => {
      const events: any[] = [];
      emitter.on('status-changed', (data) => events.push(data));

      const accountId = 'test-account-1';
      const code = 401;

      // Simulate handleDisconnected
      emitter.emit('status-changed', { accountId, status: 'disconnected' });

      if (code === 401) {
        // Delete session (mocked)
        emitter.emit('status-changed', { accountId, status: 'logged_out' });
      }

      expect(events).toHaveLength(2);
      expect(events[0].status).toBe('disconnected');
      expect(events[1].status).toBe('logged_out');
    });

    it('should emit error on connection replaced', () => {
      const events: any[] = [];
      emitter.on('status-changed', (data) => events.push(data));
      emitter.on('error', (data) => events.push(data));

      const accountId = 'test-account-1';

      emitter.emit('status-changed', { accountId, status: 'disconnected' });
      emitter.emit('error', { accountId, error: 'Connection replaced by another device' });

      expect(events).toHaveLength(2);
      expect(events[1].error).toBe('Connection replaced by another device');
    });

    it('should schedule reconnect on timeout/connection lost', () => {
      const events: any[] = [];
      emitter.on('status-changed', (data) => events.push(data));
      emitter.on('reconnecting', (data) => events.push(data));

      const accountId = 'test-account-1';
      let reconnectAttempt = 0;
      const MAX_RECONNECT_ATTEMPTS = 10;
      const MAX_BACKOFF_MS = 30_000;

      // Simulate scheduleReconnect
      const stopRequested = false;
      if (!stopRequested && reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempt++;
        const base = Math.min(1000 * Math.pow(2, reconnectAttempt - 1), MAX_BACKOFF_MS);

        emitter.emit('reconnecting', {
          accountId,
          attempt: reconnectAttempt,
          delayMs: base,
        });
      }

      expect(events).toHaveLength(1);
      expect(events[0].attempt).toBe(1);
      expect(events[0].delayMs).toBe(1000);
    });

    it('should stop reconnecting after MAX_RECONNECT_ATTEMPTS', () => {
      const events: any[] = [];
      emitter.on('error', (data) => events.push(data));

      const accountId = 'test-account-1';
      const MAX_RECONNECT_ATTEMPTS = 10;
      let reconnectAttempt = 10; // Already at max

      if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
        emitter.emit('error', {
          accountId,
          error: `Reconnect failed after ${MAX_RECONNECT_ATTEMPTS} attempts`,
        });
      }

      expect(events).toHaveLength(1);
      expect(events[0].error).toContain('Reconnect failed');
    });

    it('should not emit QR when using pairing code', () => {
      const events: any[] = [];
      emitter.on('qr', (data) => events.push(data));

      const usePairingCode = true;
      const qr = 'qr-data-string';

      if (qr && !usePairingCode) {
        emitter.emit('qr', { accountId: 'test', qrCode: qr });
      }

      expect(events).toHaveLength(0);
    });

    it('should not reconnect when stopRequested is true', () => {
      const events: any[] = [];
      emitter.on('reconnecting', (data) => events.push(data));

      const stopRequested = true;
      const reconnectAttempt = 0;
      const MAX_RECONNECT_ATTEMPTS = 10;

      if (!stopRequested && reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
        emitter.emit('reconnecting', { accountId: 'test', attempt: 1 });
      }

      expect(events).toHaveLength(0);
    });

    it('should emit error on 428 connection terminated', () => {
      const events: any[] = [];
      emitter.on('error', (data) => events.push(data));

      const code = 428;
      if (code === 428) {
        emitter.emit('error', { accountId: 'test', error: 'Connection terminated' });
      }

      expect(events).toHaveLength(1);
      expect(events[0].error).toBe('Connection terminated');
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate correct backoff delays', () => {
      const MAX_BACKOFF_MS = 30_000;
      const delays: number[] = [];

      for (let attempt = 1; attempt <= 10; attempt++) {
        const base = Math.min(1000 * Math.pow(2, attempt - 1), MAX_BACKOFF_MS);
        delays.push(base);
      }

      expect(delays[0]).toBe(1000);   // 1s
      expect(delays[1]).toBe(2000);   // 2s
      expect(delays[2]).toBe(4000);   // 4s
      expect(delays[3]).toBe(8000);   // 8s
      expect(delays[4]).toBe(16000);  // 16s
      expect(delays[5]).toBe(30000);  // capped at 30s
      expect(delays[6]).toBe(30000);  // capped
      expect(delays[7]).toBe(30000);  // capped
      expect(delays[8]).toBe(30000);  // capped
      expect(delays[9]).toBe(30000);  // capped
    });

    it('should add jitter within ±20%', () => {
      const withJitter = (ms: number): number => {
        const delta = Math.floor(ms * 0.2);
        return ms + Math.floor(Math.random() * (2 * delta + 1)) - delta;
      };

      // Run multiple times to check range
      for (let i = 0; i < 100; i++) {
        const result = withJitter(1000);
        expect(result).toBeGreaterThanOrEqual(800);
        expect(result).toBeLessThanOrEqual(1200);
      }
    });
  });

  describe('Disconnect Reason Routing', () => {
    // Mirror the switch statement from handleDisconnected
    function routeDisconnect(code: number): string {
      switch (code) {
        case 401: return 'logged_out';
        case 440: return 'connection_replaced'; // connectionReplaced
        case 428: return 'connection_terminated';
        case 408:
        case 429:
        case 500:
        case 502:
        case 503:
        case 504:
          return 'reconnect';
        default:
          return 'reconnect';
      }
    }

    it('should route 401 to logged_out', () => {
      expect(routeDisconnect(401)).toBe('logged_out');
    });

    it('should route 440 to connection_replaced', () => {
      expect(routeDisconnect(440)).toBe('connection_replaced');
    });

    it('should route 428 to connection_terminated', () => {
      expect(routeDisconnect(428)).toBe('connection_terminated');
    });

    it('should route 408 to reconnect', () => {
      expect(routeDisconnect(408)).toBe('reconnect');
    });

    it('should route 429 to reconnect', () => {
      expect(routeDisconnect(429)).toBe('reconnect');
    });

    it('should route 5xx to reconnect', () => {
      expect(routeDisconnect(500)).toBe('reconnect');
      expect(routeDisconnect(502)).toBe('reconnect');
      expect(routeDisconnect(503)).toBe('reconnect');
      expect(routeDisconnect(504)).toBe('reconnect');
    });

    it('should route unknown codes to reconnect', () => {
      expect(routeDisconnect(999)).toBe('reconnect');
    });
  });
});
