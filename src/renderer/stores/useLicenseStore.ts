import { create } from 'zustand';
import { LicenseState, LicensePayload } from '../../shared/types';

interface LicenseStoreState {
  licenseState: LicenseState;
  fingerprint: string | null;
  isLoading: boolean;
  error: string | null;
}

interface LicenseActions {
  // Validation
  validateLicense: (payload: LicensePayload) => Promise<LicenseState>;
  activateLicense: (licenseString: string) => Promise<LicenseState>;
  checkLicenseState: () => Promise<void>;
  fetchFingerprint: () => Promise<void>;

  // State updates
  setLicenseState: (state: LicenseState) => void;
  setError: (error: string | null) => void;

  // Utilities
  isValid: () => boolean;
  canAddAccount: (currentCount: number) => boolean;
}

type LicenseStore = LicenseStoreState & LicenseActions;

export const useLicenseStore = create<LicenseStore>((set, get) => ({
  // Initial state
  licenseState: {
    isValid: false,
    maxAccounts: 0,
  },
  fingerprint: null,
  isLoading: false,
  error: null,

  // Validate license (legacy - from decoded payload)
  validateLicense: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const state = await window.electronAPI.license.validate(payload);
      set({ licenseState: state, isLoading: false });
      return state;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Activate license from raw license string (signature verified server-side + persisted)
  activateLicense: async (licenseString) => {
    set({ isLoading: true, error: null });
    try {
      const state = await window.electronAPI.license.activate(licenseString);
      set({ licenseState: state, isLoading: false });
      return state;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Check current license state
  checkLicenseState: async () => {
    set({ isLoading: true, error: null });
    try {
      const state = await window.electronAPI.license.getState();
      set({ licenseState: state, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Fetch device fingerprint
  fetchFingerprint: async () => {
    try {
      const fingerprint = await window.electronAPI.license.getFingerprint();
      set({ fingerprint });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Set license state
  setLicenseState: (state) => {
    set({ licenseState: state });
  },

  // Set error
  setError: (error) => {
    set({ error });
  },

  // Check if license is valid
  isValid: () => {
    return get().licenseState.isValid;
  },

  // Check if can add more accounts
  canAddAccount: (currentCount) => {
    const { licenseState } = get();
    return licenseState.isValid && currentCount < licenseState.maxAccounts;
  },
}));
