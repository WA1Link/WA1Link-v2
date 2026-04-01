import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

// Mock window.electronAPI before importing the store
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn().mockResolvedValue(undefined);
const mockGetAll = vi.fn().mockResolvedValue([]);
const mockCreate = vi.fn().mockImplementation((input) =>
  Promise.resolve({ id: 'new-id', ...input, phoneNumber: null, isVerified: false, createdAt: new Date().toISOString() })
);
const mockDelete = vi.fn().mockResolvedValue(undefined);

(globalThis as any).window = {
  electronAPI: {
    account: {
      connect: mockConnect,
      disconnect: mockDisconnect,
      getAll: mockGetAll,
      create: mockCreate,
      delete: mockDelete,
      onStatusChanged: vi.fn().mockReturnValue(() => {}),
      onQRReceived: vi.fn().mockReturnValue(() => {}),
      onPairingCodeReceived: vi.fn().mockReturnValue(() => {}),
    },
  },
};

// Import store after mocks are set
import { useAccountStore } from '../renderer/stores/useAccountStore';

describe('useAccountStore', () => {
  beforeEach(() => {
    // Reset store state
    const store = useAccountStore.getState();
    useAccountStore.setState({
      accounts: [],
      activeAccountId: null,
      connectionStatus: new Map(),
      qrCodes: new Map(),
      pairingCodes: new Map(),
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('connect()', () => {
    it('should set status to connecting when connect is called', async () => {
      const store = useAccountStore.getState();

      await act(async () => {
        await store.connect('account-1');
      });

      const status = useAccountStore.getState().connectionStatus.get('account-1');
      expect(status).toBe('connecting');
      expect(mockConnect).toHaveBeenCalledWith('account-1', undefined, undefined);
    });

    it('should set status to disconnected on connect failure', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Connection failed'));

      const store = useAccountStore.getState();

      await expect(
        act(async () => {
          await store.connect('account-1');
        })
      ).rejects.toThrow('Connection failed');

      const status = useAccountStore.getState().connectionStatus.get('account-1');
      expect(status).toBe('disconnected');
      expect(useAccountStore.getState().error).toBe('Connection failed');
    });

    it('should pass pairing code params to IPC', async () => {
      const store = useAccountStore.getState();

      await act(async () => {
        await store.connect('account-1', true, '994501234567');
      });

      expect(mockConnect).toHaveBeenCalledWith('account-1', true, '994501234567');
    });
  });

  describe('disconnect()', () => {
    it('should set status to disconnected after disconnect', async () => {
      // First set as connected
      const statusMap = new Map();
      statusMap.set('account-1', 'connected');
      useAccountStore.setState({ connectionStatus: statusMap });

      const store = useAccountStore.getState();
      await act(async () => {
        await store.disconnect('account-1');
      });

      const status = useAccountStore.getState().connectionStatus.get('account-1');
      expect(status).toBe('disconnected');
      expect(mockDisconnect).toHaveBeenCalledWith('account-1');
    });

    it('should set error on disconnect failure', async () => {
      mockDisconnect.mockRejectedValueOnce(new Error('Disconnect failed'));

      const store = useAccountStore.getState();
      await expect(
        act(async () => {
          await store.disconnect('account-1');
        })
      ).rejects.toThrow('Disconnect failed');

      expect(useAccountStore.getState().error).toBe('Disconnect failed');
    });
  });

  describe('updateConnectionStatus()', () => {
    it('should update status for connected event', () => {
      useAccountStore.setState({
        accounts: [{ id: 'account-1', name: 'Test', phoneNumber: null, countryCode: '994', isVerified: false, createdAt: '' }],
      });

      const store = useAccountStore.getState();
      act(() => {
        store.updateConnectionStatus({ accountId: 'account-1', status: 'connected' });
      });

      const state = useAccountStore.getState();
      expect(state.connectionStatus.get('account-1')).toBe('connected');
      expect(state.activeAccountId).toBe('account-1');
    });

    it('should clear QR and pairing codes on connected', () => {
      const qrCodes = new Map([['account-1', 'qr-data']]);
      const pairingCodes = new Map([['account-1', 'ABCD-EFGH']]);
      useAccountStore.setState({
        qrCodes,
        pairingCodes,
        accounts: [{ id: 'account-1', name: 'Test', phoneNumber: null, countryCode: '994', isVerified: false, createdAt: '' }],
      });

      const store = useAccountStore.getState();
      act(() => {
        store.updateConnectionStatus({ accountId: 'account-1', status: 'connected' });
      });

      const state = useAccountStore.getState();
      expect(state.qrCodes.get('account-1')).toBeUndefined();
      expect(state.pairingCodes.get('account-1')).toBeUndefined();
    });

    it('should mark account as verified on connected', () => {
      useAccountStore.setState({
        accounts: [{ id: 'account-1', name: 'Test', phoneNumber: null, countryCode: '994', isVerified: false, createdAt: '' }],
      });

      const store = useAccountStore.getState();
      act(() => {
        store.updateConnectionStatus({ accountId: 'account-1', status: 'connected' });
      });

      const account = useAccountStore.getState().accounts.find((a) => a.id === 'account-1');
      expect(account?.isVerified).toBe(true);
    });

    it('should update status for logged_out event', () => {
      const store = useAccountStore.getState();
      act(() => {
        store.updateConnectionStatus({ accountId: 'account-1', status: 'logged_out' });
      });

      expect(useAccountStore.getState().connectionStatus.get('account-1')).toBe('logged_out');
    });

    it('should update status for disconnected event', () => {
      const store = useAccountStore.getState();
      act(() => {
        store.updateConnectionStatus({ accountId: 'account-1', status: 'disconnected' });
      });

      expect(useAccountStore.getState().connectionStatus.get('account-1')).toBe('disconnected');
    });

    it('should update status for qr_ready event', () => {
      const store = useAccountStore.getState();
      act(() => {
        store.updateConnectionStatus({ accountId: 'account-1', status: 'qr_ready' });
      });

      expect(useAccountStore.getState().connectionStatus.get('account-1')).toBe('qr_ready');
    });

    it('should update status for connecting event', () => {
      const store = useAccountStore.getState();
      act(() => {
        store.updateConnectionStatus({ accountId: 'account-1', status: 'connecting' });
      });

      expect(useAccountStore.getState().connectionStatus.get('account-1')).toBe('connecting');
    });
  });

  describe('QR and Pairing Code Management', () => {
    it('should set QR code', () => {
      const store = useAccountStore.getState();
      act(() => {
        store.setQRCode('account-1', 'qr-data-123');
      });

      expect(useAccountStore.getState().qrCodes.get('account-1')).toBe('qr-data-123');
    });

    it('should set pairing code', () => {
      const store = useAccountStore.getState();
      act(() => {
        store.setPairingCode('account-1', 'ABCD-EFGH');
      });

      expect(useAccountStore.getState().pairingCodes.get('account-1')).toBe('ABCD-EFGH');
    });

    it('should clear QR code', () => {
      useAccountStore.setState({ qrCodes: new Map([['account-1', 'qr-data']]) });

      const store = useAccountStore.getState();
      act(() => {
        store.clearQRCode('account-1');
      });

      expect(useAccountStore.getState().qrCodes.get('account-1')).toBeUndefined();
    });

    it('should clear pairing code', () => {
      useAccountStore.setState({ pairingCodes: new Map([['account-1', 'ABCD']]) });

      const store = useAccountStore.getState();
      act(() => {
        store.clearPairingCode('account-1');
      });

      expect(useAccountStore.getState().pairingCodes.get('account-1')).toBeUndefined();
    });
  });

  describe('Account CRUD', () => {
    it('should fetch accounts', async () => {
      const mockAccounts = [
        { id: '1', name: 'Account 1', phoneNumber: '+123', countryCode: '1', isVerified: true, createdAt: '' },
      ];
      mockGetAll.mockResolvedValueOnce(mockAccounts);

      const store = useAccountStore.getState();
      await act(async () => {
        await store.fetchAccounts();
      });

      expect(useAccountStore.getState().accounts).toEqual(mockAccounts);
      expect(useAccountStore.getState().isLoading).toBe(false);
    });

    it('should create account', async () => {
      const store = useAccountStore.getState();
      let result: any;
      await act(async () => {
        result = await store.createAccount({ name: 'New Account', countryCode: '994' });
      });

      expect(result.id).toBe('new-id');
      expect(useAccountStore.getState().accounts).toHaveLength(1);
    });

    it('should delete account and clear activeAccountId if it was active', async () => {
      useAccountStore.setState({
        accounts: [{ id: 'acc-1', name: 'Test', phoneNumber: null, countryCode: '994', isVerified: false, createdAt: '' }],
        activeAccountId: 'acc-1',
      });

      const store = useAccountStore.getState();
      await act(async () => {
        await store.deleteAccount('acc-1');
      });

      const state = useAccountStore.getState();
      expect(state.accounts).toHaveLength(0);
      expect(state.activeAccountId).toBeNull();
    });
  });
});
