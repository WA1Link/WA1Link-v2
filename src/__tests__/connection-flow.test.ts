import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration tests for the full connection flow.
 * Tests the interaction between AccountManager's IPC listener logic,
 * the store, and different connection status transitions.
 */

// Mock IPC
const statusCallbacks: Array<(connection: any) => void> = [];
const qrCallbacks: Array<(data: any) => void> = [];
const pairingCallbacks: Array<(data: any) => void> = [];

const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn().mockResolvedValue(undefined);

(globalThis as any).window = {
  electronAPI: {
    account: {
      connect: mockConnect,
      disconnect: mockDisconnect,
      getAll: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      delete: vi.fn(),
      onStatusChanged: vi.fn().mockImplementation((cb) => {
        statusCallbacks.push(cb);
        return () => {
          const idx = statusCallbacks.indexOf(cb);
          if (idx > -1) statusCallbacks.splice(idx, 1);
        };
      }),
      onQRReceived: vi.fn().mockImplementation((cb) => {
        qrCallbacks.push(cb);
        return () => {
          const idx = qrCallbacks.indexOf(cb);
          if (idx > -1) qrCallbacks.splice(idx, 1);
        };
      }),
      onPairingCodeReceived: vi.fn().mockImplementation((cb) => {
        pairingCallbacks.push(cb);
        return () => {
          const idx = pairingCallbacks.indexOf(cb);
          if (idx > -1) pairingCallbacks.splice(idx, 1);
        };
      }),
    },
  },
};

import { useAccountStore } from '../renderer/stores/useAccountStore';

// Simulate what AccountManager does: wire up IPC listeners to store
function setupIPCListeners() {
  const store = useAccountStore.getState();
  let connectingAccountId: string | null = null;
  let isConnecting = false;
  const toasts: Array<{ type: string; message: string }> = [];

  const unsubStatus = window.electronAPI.account.onStatusChanged((connection: any) => {
    store.updateConnectionStatus(connection);

    if (connection.status === 'connected') {
      connectingAccountId = null;
      isConnecting = false;
      store.clearQRCode(connection.accountId);
      store.clearPairingCode(connection.accountId);
      toasts.push({ type: 'success', message: 'Connected to WhatsApp' });
    } else if (connection.status === 'logged_out') {
      connectingAccountId = null;
      isConnecting = false;
      store.clearQRCode(connection.accountId);
      store.clearPairingCode(connection.accountId);
      toasts.push({ type: 'error', message: 'Session expired. Please connect again.' });
    } else if (connection.status === 'disconnected' && connectingAccountId === connection.accountId) {
      isConnecting = false;
    }
  });

  return {
    getConnectingAccountId: () => connectingAccountId,
    getIsConnecting: () => isConnecting,
    getToasts: () => toasts,
    setConnectingAccountId: (id: string | null) => { connectingAccountId = id; },
    setIsConnecting: (v: boolean) => { isConnecting = v; },
    cleanup: unsubStatus,
    emitStatus: (data: any) => statusCallbacks.forEach((cb) => cb(data)),
    emitQR: (data: any) => qrCallbacks.forEach((cb) => cb(data)),
    emitPairing: (data: any) => pairingCallbacks.forEach((cb) => cb(data)),
  };
}

describe('Connection Flow Integration', () => {
  let ctx: ReturnType<typeof setupIPCListeners>;

  beforeEach(() => {
    useAccountStore.setState({
      accounts: [
        { id: 'acc-1', name: 'My WhatsApp', phoneNumber: '994501234567', countryCode: '994', isVerified: true, createdAt: '' },
      ],
      activeAccountId: null,
      connectionStatus: new Map(),
      qrCodes: new Map(),
      pairingCodes: new Map(),
      isLoading: false,
      error: null,
    });
    statusCallbacks.length = 0;
    qrCallbacks.length = 0;
    pairingCallbacks.length = 0;
    vi.clearAllMocks();

    ctx = setupIPCListeners();
  });

  describe('Scenario 1: Successful QR Code Connection', () => {
    it('should complete full QR flow: connecting → qr_ready → connected', async () => {
      const store = useAccountStore.getState();
      ctx.setConnectingAccountId('acc-1');
      ctx.setIsConnecting(true);

      // User clicks connect → IPC called
      await store.connect('acc-1', false);
      expect(mockConnect).toHaveBeenCalledWith('acc-1', false, undefined);
      expect(useAccountStore.getState().connectionStatus.get('acc-1')).toBe('connecting');

      // Socket emits connecting
      ctx.emitStatus({ accountId: 'acc-1', status: 'connecting' });
      expect(useAccountStore.getState().connectionStatus.get('acc-1')).toBe('connecting');

      // Socket emits qr_ready
      ctx.emitStatus({ accountId: 'acc-1', status: 'qr_ready' });
      expect(useAccountStore.getState().connectionStatus.get('acc-1')).toBe('qr_ready');

      // QR code received
      ctx.emitQR({ accountId: 'acc-1', qrCode: 'qr-data-123' });

      // User scans QR → connection opens
      ctx.emitStatus({ accountId: 'acc-1', status: 'connected' });

      const state = useAccountStore.getState();
      expect(state.connectionStatus.get('acc-1')).toBe('connected');
      expect(state.activeAccountId).toBe('acc-1');
      expect(ctx.getIsConnecting()).toBe(false);
      expect(ctx.getConnectingAccountId()).toBeNull();
      expect(ctx.getToasts().pop()?.message).toBe('Connected to WhatsApp');
    });
  });

  describe('Scenario 2: Successful Pairing Code Connection', () => {
    it('should complete full pairing flow: connecting → pairing code → connected', async () => {
      const store = useAccountStore.getState();
      ctx.setConnectingAccountId('acc-1');
      ctx.setIsConnecting(true);

      await store.connect('acc-1', true, '994501234567');
      expect(mockConnect).toHaveBeenCalledWith('acc-1', true, '994501234567');

      // Socket emits connecting
      ctx.emitStatus({ accountId: 'acc-1', status: 'connecting' });

      // Pairing code received
      ctx.emitPairing({ accountId: 'acc-1', code: 'ABCD-EFGH' });

      // User enters code → connection opens
      ctx.emitStatus({ accountId: 'acc-1', status: 'connected' });

      const state = useAccountStore.getState();
      expect(state.connectionStatus.get('acc-1')).toBe('connected');
      expect(ctx.getIsConnecting()).toBe(false);
      expect(ctx.getConnectingAccountId()).toBeNull();
    });
  });

  describe('Scenario 3: Session Expired (Logged Out)', () => {
    it('should handle logged_out: reset UI state and show error toast', () => {
      ctx.setConnectingAccountId('acc-1');
      ctx.setIsConnecting(true);

      // Set some QR/pairing data
      useAccountStore.getState().setQRCode('acc-1', 'old-qr');
      useAccountStore.getState().setPairingCode('acc-1', 'OLD-CODE');

      // Socket detects invalid session → emits disconnected then logged_out
      ctx.emitStatus({ accountId: 'acc-1', status: 'disconnected' });
      ctx.emitStatus({ accountId: 'acc-1', status: 'logged_out' });

      const state = useAccountStore.getState();
      expect(state.connectionStatus.get('acc-1')).toBe('logged_out');
      expect(state.qrCodes.get('acc-1')).toBeUndefined();
      expect(state.pairingCodes.get('acc-1')).toBeUndefined();
      expect(ctx.getIsConnecting()).toBe(false);
      expect(ctx.getConnectingAccountId()).toBeNull();
      expect(ctx.getToasts().pop()?.message).toBe('Session expired. Please connect again.');
    });
  });

  describe('Scenario 4: Connection Fails During Connect', () => {
    it('should handle IPC connect error gracefully', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Network error'));

      const store = useAccountStore.getState();
      ctx.setConnectingAccountId('acc-1');
      ctx.setIsConnecting(true);

      await expect(store.connect('acc-1')).rejects.toThrow('Network error');

      const state = useAccountStore.getState();
      expect(state.connectionStatus.get('acc-1')).toBe('disconnected');
      expect(state.error).toBe('Network error');
    });
  });

  describe('Scenario 5: Disconnection During Active Session', () => {
    it('should handle graceful disconnect', async () => {
      // Start as connected
      useAccountStore.setState({
        connectionStatus: new Map([['acc-1', 'connected']]),
        activeAccountId: 'acc-1',
      });

      const store = useAccountStore.getState();
      await store.disconnect('acc-1');

      expect(useAccountStore.getState().connectionStatus.get('acc-1')).toBe('disconnected');
      expect(mockDisconnect).toHaveBeenCalledWith('acc-1');
    });
  });

  describe('Scenario 6: Connection Replaced By Another Device', () => {
    it('should handle connection replaced → disconnected status', () => {
      useAccountStore.setState({
        connectionStatus: new Map([['acc-1', 'connected']]),
        activeAccountId: 'acc-1',
      });

      ctx.emitStatus({ accountId: 'acc-1', status: 'disconnected' });

      expect(useAccountStore.getState().connectionStatus.get('acc-1')).toBe('disconnected');
    });
  });

  describe('Scenario 7: Reconnection After Timeout', () => {
    it('should stay in connecting state during reconnection attempts', () => {
      ctx.setConnectingAccountId('acc-1');
      ctx.setIsConnecting(true);

      // Connection drops with reconnectable error
      ctx.emitStatus({ accountId: 'acc-1', status: 'disconnected' });

      // isConnecting should be reset since we got disconnected
      expect(ctx.getIsConnecting()).toBe(false);

      // Socket service internally reconnects → emits connecting again
      ctx.emitStatus({ accountId: 'acc-1', status: 'connecting' });
      expect(useAccountStore.getState().connectionStatus.get('acc-1')).toBe('connecting');

      // Reconnect succeeds
      ctx.emitStatus({ accountId: 'acc-1', status: 'connected' });
      expect(useAccountStore.getState().connectionStatus.get('acc-1')).toBe('connected');
    });
  });

  describe('Scenario 8: User Cancels During QR Wait', () => {
    it('should clean up state when user closes modal during QR wait', () => {
      ctx.setConnectingAccountId('acc-1');
      ctx.setIsConnecting(true);
      useAccountStore.getState().setQRCode('acc-1', 'qr-data');

      // User closes modal → handleCloseConnect
      const accountId = ctx.getConnectingAccountId();
      ctx.setConnectingAccountId(null);
      ctx.setIsConnecting(false);
      if (accountId) {
        useAccountStore.getState().clearQRCode(accountId);
        useAccountStore.getState().clearPairingCode(accountId);
      }

      expect(ctx.getConnectingAccountId()).toBeNull();
      expect(ctx.getIsConnecting()).toBe(false);
      expect(useAccountStore.getState().qrCodes.get('acc-1')).toBeUndefined();
    });
  });

  describe('Scenario 9: Multiple Rapid Status Changes', () => {
    it('should handle rapid connecting → qr_ready → disconnected → connecting → connected', () => {
      ctx.setConnectingAccountId('acc-1');
      ctx.setIsConnecting(true);

      ctx.emitStatus({ accountId: 'acc-1', status: 'connecting' });
      ctx.emitStatus({ accountId: 'acc-1', status: 'qr_ready' });
      ctx.emitStatus({ accountId: 'acc-1', status: 'disconnected' });
      ctx.emitStatus({ accountId: 'acc-1', status: 'connecting' });
      ctx.emitStatus({ accountId: 'acc-1', status: 'connected' });

      const state = useAccountStore.getState();
      expect(state.connectionStatus.get('acc-1')).toBe('connected');
      expect(ctx.getIsConnecting()).toBe(false);
      expect(ctx.getConnectingAccountId()).toBeNull();
    });
  });

  describe('Scenario 10: Connect Account That Was Previously Logged Out', () => {
    it('should allow reconnection after logged_out status', async () => {
      // Account was logged out
      useAccountStore.setState({
        connectionStatus: new Map([['acc-1', 'logged_out']]),
      });

      const store = useAccountStore.getState();
      ctx.setConnectingAccountId('acc-1');
      ctx.setIsConnecting(true);

      // User clicks connect again
      await store.connect('acc-1', false);

      expect(useAccountStore.getState().connectionStatus.get('acc-1')).toBe('connecting');

      // New QR shown
      ctx.emitStatus({ accountId: 'acc-1', status: 'qr_ready' });
      expect(useAccountStore.getState().connectionStatus.get('acc-1')).toBe('qr_ready');

      // Successful connection
      ctx.emitStatus({ accountId: 'acc-1', status: 'connected' });
      expect(useAccountStore.getState().connectionStatus.get('acc-1')).toBe('connected');
      expect(ctx.getIsConnecting()).toBe(false);
    });
  });

  describe('Scenario 11: Disconnect Error Handling', () => {
    it('should handle disconnect IPC failure', async () => {
      mockDisconnect.mockRejectedValueOnce(new Error('IPC timeout'));

      useAccountStore.setState({
        connectionStatus: new Map([['acc-1', 'connected']]),
      });

      const store = useAccountStore.getState();
      await expect(store.disconnect('acc-1')).rejects.toThrow('IPC timeout');
      expect(useAccountStore.getState().error).toBe('IPC timeout');
    });
  });

  describe('Scenario 12: Status Update for Non-Active Connecting Account', () => {
    it('should not reset isConnecting for a different account disconnecting', () => {
      ctx.setConnectingAccountId('acc-1');
      ctx.setIsConnecting(true);

      // Different account disconnects
      ctx.emitStatus({ accountId: 'acc-2', status: 'disconnected' });

      // isConnecting should still be true for acc-1
      expect(ctx.getIsConnecting()).toBe(true);
      expect(ctx.getConnectingAccountId()).toBe('acc-1');
    });
  });
});
