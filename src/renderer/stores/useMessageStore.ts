import { create } from 'zustand';
import {
  MessageTemplate,
  Target,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../../shared/types';

interface MessageState {
  templates: MessageTemplate[];
  targets: Target[];
  isLoading: boolean;
  error: string | null;
}

interface MessageActions {
  // Templates
  fetchTemplates: () => Promise<void>;
  createTemplate: (input: CreateTemplateInput) => Promise<MessageTemplate>;
  updateTemplate: (input: UpdateTemplateInput) => Promise<MessageTemplate | null>;
  deleteTemplate: (id: string) => Promise<void>;
  toggleTemplateSelection: (id: string) => void;
  getSelectedTemplates: () => MessageTemplate[];
  getSelectedTemplateIds: () => string[];

  // Targets
  setTargets: (targets: Target[]) => void;
  clearTargets: () => void;
  updateTargetStatus: (phoneNumber: string, status: 'pending' | 'sent' | 'failed', error?: string) => void;

  // Utilities
  setError: (error: string | null) => void;
}

type MessageStore = MessageState & MessageActions;

export const useMessageStore = create<MessageStore>((set, get) => ({
  // Initial state
  templates: [],
  targets: [],
  isLoading: false,
  error: null,

  // Fetch all templates
  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates = await window.electronAPI.message.getAllTemplates();
      set({ templates, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Create template
  createTemplate: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const template = await window.electronAPI.message.createTemplate(input);
      set((state) => ({
        templates: [template, ...state.templates],
        isLoading: false,
      }));
      return template;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Update template
  updateTemplate: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const template = await window.electronAPI.message.updateTemplate(input);
      if (template) {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === template.id ? template : t)),
          isLoading: false,
        }));
      }
      return template;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Delete template
  deleteTemplate: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await window.electronAPI.message.deleteTemplate(id);
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Toggle template selection
  toggleTemplateSelection: (id) => {
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, isSelected: !t.isSelected } : t
      ),
    }));
  },

  // Get selected templates
  getSelectedTemplates: () => {
    return get().templates.filter((t) => t.isSelected);
  },

  // Get selected template IDs
  getSelectedTemplateIds: () => {
    return get()
      .templates.filter((t) => t.isSelected)
      .map((t) => t.id);
  },

  // Set targets
  setTargets: (targets) => {
    set({ targets });
  },

  // Clear targets
  clearTargets: () => {
    set({ targets: [] });
  },

  // Update target status
  updateTargetStatus: (phoneNumber, status, error) => {
    set((state) => ({
      targets: state.targets.map((t) =>
        t.phoneNumber === phoneNumber ? { ...t, status, error } : t
      ),
    }));
  },

  // Set error
  setError: (error) => {
    set({ error });
  },
}));
