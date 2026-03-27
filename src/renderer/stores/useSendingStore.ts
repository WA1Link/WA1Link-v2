import { create } from 'zustand';
import { DelayConfig, SendingProgress, DEFAULT_DELAY_CONFIG } from '../../shared/types';

interface SendingState {
  isSending: boolean;
  isPaused: boolean;
  delayConfig: DelayConfig;
  progress: SendingProgress | null;
  errors: Array<{ phoneNumber: string; error: string }>;
}

interface SendingActions {
  // Sending control
  startSending: () => void;
  stopSending: () => Promise<void>;
  pauseSending: () => void;
  resumeSending: () => void;

  // Progress updates
  updateProgress: (progress: SendingProgress) => void;
  onSendingComplete: (result: { sent: number; failed: number }) => void;
  resetProgress: () => void;

  // Delay config
  setDelayConfig: (config: Partial<DelayConfig>) => void;
  resetDelayConfig: () => void;

  // Errors
  addError: (phoneNumber: string, error: string) => void;
  clearErrors: () => void;
}

type SendingStore = SendingState & SendingActions;

export const useSendingStore = create<SendingStore>((set, get) => ({
  // Initial state
  isSending: false,
  isPaused: false,
  delayConfig: DEFAULT_DELAY_CONFIG,
  progress: null,
  errors: [],

  // Start sending
  startSending: () => {
    set({
      isSending: true,
      isPaused: false,
      progress: null,
      errors: [],
    });
  },

  // Stop sending
  stopSending: async () => {
    try {
      await window.electronAPI.message.stopSending();
      set({
        isSending: false,
        isPaused: false,
      });
    } catch (error) {
      console.error('Failed to stop sending:', error);
    }
  },

  // Pause sending (client-side flag)
  pauseSending: () => {
    set({ isPaused: true });
  },

  // Resume sending
  resumeSending: () => {
    set({ isPaused: false });
  },

  // Update progress from IPC
  updateProgress: (progress) => {
    set({
      progress,
      errors: progress.errors,
    });
  },

  // Handle sending complete
  onSendingComplete: (result) => {
    set({
      isSending: false,
      isPaused: false,
      progress: {
        ...get().progress!,
        sent: result.sent,
        failed: result.failed,
      },
    });
  },

  // Reset progress
  resetProgress: () => {
    set({
      progress: null,
      errors: [],
    });
  },

  // Set delay config
  setDelayConfig: (config) => {
    set((state) => ({
      delayConfig: {
        ...state.delayConfig,
        ...config,
      },
    }));
  },

  // Reset delay config to defaults
  resetDelayConfig: () => {
    set({ delayConfig: DEFAULT_DELAY_CONFIG });
  },

  // Add error
  addError: (phoneNumber, error) => {
    set((state) => ({
      errors: [...state.errors, { phoneNumber, error }],
    }));
  },

  // Clear errors
  clearErrors: () => {
    set({ errors: [] });
  },
}));
