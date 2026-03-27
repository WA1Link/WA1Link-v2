import { create } from 'zustand';
import {
  Account,
  AccountConnection,
  ConnectionStatus,
  CreateAccountInput,
} from '../../shared/types';

interface AccountState {
  accounts: Account[];
  activeAccountId: string | null;
  connectionStatus: Map<string, ConnectionStatus>;
  qrCodes: Map<string, string>;
  pairingCodes: Map<string, string>;
  isLoading: boolean;
  error: string | null;
}

interface AccountActions {
  // Data fetching
  fetchAccounts: () => Promise<void>;

  // CRUD
  createAccount: (input: CreateAccountInput) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;

  // Connection
  connect: (id: string, usePairingCode?: boolean, phoneNumber?: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  setActiveAccount: (id: string | null) => void;

  // Status updates from IPC
  updateConnectionStatus: (connection: AccountConnection) => void;
  setQRCode: (accountId: string, qrCode: string) => void;
  setPairingCode: (accountId: string, code: string) => void;
  clearQRCode: (accountId: string) => void;
  clearPairingCode: (accountId: string) => void;

  // Utilities
  getAccountById: (id: string) => Account | undefined;
  setError: (error: string | null) => void;
}

type AccountStore = AccountState & AccountActions;

export const useAccountStore = create<AccountStore>((set, get) => ({
  // Initial state
  accounts: [],
  activeAccountId: null,
  connectionStatus: new Map(),
  qrCodes: new Map(),
  pairingCodes: new Map(),
  isLoading: false,
  error: null,

  // Fetch all accounts
  fetchAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const accounts = await window.electronAPI.account.getAll();
      set({ accounts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Create account
  createAccount: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const account = await window.electronAPI.account.create(input);
      set((state) => ({
        accounts: [...state.accounts, account],
        isLoading: false,
      }));
      return account;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Delete account
  deleteAccount: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await window.electronAPI.account.delete(id);
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        activeAccountId: state.activeAccountId === id ? null : state.activeAccountId,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Connect to WhatsApp
  connect: async (id, usePairingCode, phoneNumber) => {
    const { connectionStatus } = get();
    const newStatus = new Map(connectionStatus);
    newStatus.set(id, 'connecting');
    set({ connectionStatus: newStatus, error: null });

    try {
      await window.electronAPI.account.connect(id, usePairingCode, phoneNumber);
    } catch (error) {
      const status = new Map(get().connectionStatus);
      status.set(id, 'disconnected');
      set({ connectionStatus: status, error: (error as Error).message });
      throw error;
    }
  },

  // Disconnect from WhatsApp
  disconnect: async (id) => {
    try {
      await window.electronAPI.account.disconnect(id);
      const { connectionStatus } = get();
      const newStatus = new Map(connectionStatus);
      newStatus.set(id, 'disconnected');
      set({ connectionStatus: newStatus });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Set active account
  setActiveAccount: (id) => {
    set({ activeAccountId: id });
  },

  // Update connection status from IPC event
  updateConnectionStatus: (connection) => {
    const { connectionStatus, accounts } = get();
    const newStatus = new Map(connectionStatus);
    newStatus.set(connection.accountId, connection.status);

    // Clear QR/pairing code on connect
    if (connection.status === 'connected') {
      const { qrCodes, pairingCodes } = get();
      const newQR = new Map(qrCodes);
      const newPairing = new Map(pairingCodes);
      newQR.delete(connection.accountId);
      newPairing.delete(connection.accountId);
      set({
        connectionStatus: newStatus,
        activeAccountId: connection.accountId,
        qrCodes: newQR,
        pairingCodes: newPairing,
      });

      // Update account verification status
      const updatedAccounts = accounts.map((a) =>
        a.id === connection.accountId ? { ...a, isVerified: true } : a
      );
      set({ accounts: updatedAccounts });
    } else {
      set({ connectionStatus: newStatus });
    }
  },

  // Set QR code
  setQRCode: (accountId, qrCode) => {
    const { qrCodes } = get();
    const newQR = new Map(qrCodes);
    newQR.set(accountId, qrCode);
    set({ qrCodes: newQR });
  },

  // Set pairing code
  setPairingCode: (accountId, code) => {
    const { pairingCodes } = get();
    const newPairing = new Map(pairingCodes);
    newPairing.set(accountId, code);
    set({ pairingCodes: newPairing });
  },

  // Clear QR code
  clearQRCode: (accountId) => {
    const { qrCodes } = get();
    const newQR = new Map(qrCodes);
    newQR.delete(accountId);
    set({ qrCodes: newQR });
  },

  // Clear pairing code
  clearPairingCode: (accountId) => {
    const { pairingCodes } = get();
    const newPairing = new Map(pairingCodes);
    newPairing.delete(accountId);
    set({ pairingCodes: newPairing });
  },

  // Get account by ID
  getAccountById: (id) => {
    return get().accounts.find((a) => a.id === id);
  },

  // Set error
  setError: (error) => {
    set({ error });
  },
}));
