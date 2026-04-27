import { create } from 'zustand';
import {
  MessageTemplate,
  Target,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../../shared/types';

interface MessageState {
  templates: MessageTemplate[];
  selectedTemplateIds: string[];
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
  selectedTemplateIds: [],
  targets: [],
  isLoading: false,
  error: null,

  // Fetch all templates
  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const fetched = await window.electronAPI.message.getAllTemplates();
      // Re-apply the renderer-side selection set so a refetch (mount,
      // hot-reload, navigate-back) doesn't blow away the user's checkboxes.
      // The DB doesn't persist `is_selected` per-user-action, so selection is
      // a renderer concern and must survive template-data churn.
      const selectedIds = get().selectedTemplateIds;
      const templates = fetched.map((t) => ({
        ...t,
        isSelected: selectedIds.includes(t.id),
      }));
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
          templates: state.templates.map((t) =>
            t.id === template.id
              // Re-apply renderer-side isSelected so editing a selected
              // template doesn't visually un-check it.
              ? { ...template, isSelected: state.selectedTemplateIds.includes(template.id) }
              : t
          ),
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
        selectedTemplateIds: state.selectedTemplateIds.filter((x) => x !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Toggle template selection — drives the canonical selectedTemplateIds set
  // and mirrors the flag onto each template so existing components that read
  // `template.isSelected` keep working unchanged.
  toggleTemplateSelection: (id) => {
    set((state) => {
      const has = state.selectedTemplateIds.includes(id);
      const newIds = has
        ? state.selectedTemplateIds.filter((x) => x !== id)
        : [...state.selectedTemplateIds, id];
      return {
        selectedTemplateIds: newIds,
        templates: state.templates.map((t) =>
          t.id === id ? { ...t, isSelected: !has } : t
        ),
      };
    });
  },

  // Get selected templates
  getSelectedTemplates: () => {
    const ids = get().selectedTemplateIds;
    return get().templates.filter((t) => ids.includes(t.id));
  },

  // Get selected template IDs
  getSelectedTemplateIds: () => {
    return [...get().selectedTemplateIds];
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
