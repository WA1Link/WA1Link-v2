import { create } from 'zustand';

type ModalType =
  | 'qr-code'
  | 'pairing-code'
  | 'add-account'
  | 'edit-template'
  | 'schedule-job'
  | 'delay-settings'
  | 'export-contacts'
  | 'confirm-delete'
  | null;

type PageType = 'messaging' | 'contacts' | 'scheduler' | 'crm' | 'settings';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  currentPage: PageType;
  activeModal: ModalType;
  modalData: Record<string, unknown>;
  toasts: Toast[];
  isSidebarOpen: boolean;
}

interface UIActions {
  // Navigation
  navigateTo: (page: PageType) => void;

  // Modal management
  openModal: (modal: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Toast notifications
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

type UIStore = UIState & UIActions;

let toastIdCounter = 0;

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  currentPage: 'messaging',
  activeModal: null,
  modalData: {},
  toasts: [],
  isSidebarOpen: true,

  // Navigate to page
  navigateTo: (page) => {
    set({ currentPage: page });
  },

  // Open modal
  openModal: (modal, data = {}) => {
    set({ activeModal: modal, modalData: data });
  },

  // Close modal
  closeModal: () => {
    set({ activeModal: null, modalData: {} });
  },

  // Add toast notification
  addToast: (toast) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration (default 5 seconds)
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  // Remove toast
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // Clear all toasts
  clearToasts: () => {
    set({ toasts: [] });
  },

  // Toggle sidebar
  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  // Set sidebar state
  setSidebarOpen: (open) => {
    set({ isSidebarOpen: open });
  },
}));
