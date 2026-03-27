import { create } from 'zustand';
import {
  WhatsAppGroup,
  PersonalChat,
  ExtractedContact,
  ExportOptions,
} from '../../shared/types';

interface ContactState {
  groups: WhatsAppGroup[];
  personalChats: PersonalChat[];
  extractedContacts: ExtractedContact[];
  selectedGroupIds: Set<string>;
  selectedChatJids: Set<string>;
  isLoadingGroups: boolean;
  isLoadingChats: boolean;
  isExtracting: boolean;
  isExporting: boolean;
  error: string | null;
}

interface ContactActions {
  // Fetch data
  fetchGroups: (accountId: string) => Promise<void>;
  fetchPersonalChats: (accountId: string) => Promise<void>;

  // Selection
  toggleGroupSelection: (groupId: string) => void;
  toggleChatSelection: (chatJid: string) => void;
  selectAllGroups: () => void;
  selectAllChats: () => void;
  deselectAllGroups: () => void;
  deselectAllChats: () => void;

  // Extraction
  extractFromGroups: (accountId: string) => Promise<void>;
  extractFromChats: (accountId: string) => Promise<void>;
  extractAll: (accountId: string) => Promise<void>;

  // Contact management
  setExtractedContacts: (contacts: ExtractedContact[]) => void;
  deduplicateContacts: () => void;
  clearExtractedContacts: () => void;
  removeContact: (id: string) => void;

  // Export
  exportToExcel: (options?: Partial<ExportOptions>) => Promise<string>;
  exportGroupContacts: (accountId: string) => Promise<string>;
  exportPersonalContacts: (accountId: string) => Promise<string>;

  // Persistence
  saveContacts: () => Promise<void>;
  loadSavedContacts: () => Promise<void>;

  // Utilities
  setError: (error: string | null) => void;
}

type ContactStore = ContactState & ContactActions;

export const useContactStore = create<ContactStore>((set, get) => ({
  // Initial state
  groups: [],
  personalChats: [],
  extractedContacts: [],
  selectedGroupIds: new Set(),
  selectedChatJids: new Set(),
  isLoadingGroups: false,
  isLoadingChats: false,
  isExtracting: false,
  isExporting: false,
  error: null,

  // Fetch groups
  fetchGroups: async (accountId) => {
    set({ isLoadingGroups: true, error: null, groups: [] }); // Clear existing groups
    try {
      const groups = await window.electronAPI.contact.fetchGroups(accountId);
      set({ groups, isLoadingGroups: false, selectedGroupIds: new Set() });
    } catch (error) {
      set({ error: (error as Error).message, isLoadingGroups: false });
    }
  },

  // Fetch personal chats
  fetchPersonalChats: async (accountId) => {
    set({ isLoadingChats: true, error: null, personalChats: [] }); // Clear existing chats
    try {
      const personalChats = await window.electronAPI.contact.fetchPersonalChats(accountId);
      set({ personalChats, isLoadingChats: false, selectedChatJids: new Set() });
    } catch (error) {
      set({ error: (error as Error).message, isLoadingChats: false });
    }
  },

  // Toggle group selection
  toggleGroupSelection: (groupId) => {
    const { selectedGroupIds } = get();
    const newSelection = new Set(selectedGroupIds);
    if (newSelection.has(groupId)) {
      newSelection.delete(groupId);
    } else {
      newSelection.add(groupId);
    }
    set({ selectedGroupIds: newSelection });
  },

  // Toggle chat selection
  toggleChatSelection: (chatJid) => {
    const { selectedChatJids } = get();
    const newSelection = new Set(selectedChatJids);
    if (newSelection.has(chatJid)) {
      newSelection.delete(chatJid);
    } else {
      newSelection.add(chatJid);
    }
    set({ selectedChatJids: newSelection });
  },

  // Select all groups
  selectAllGroups: () => {
    const { groups } = get();
    set({ selectedGroupIds: new Set(groups.map((g) => g.id)) });
  },

  // Select all chats
  selectAllChats: () => {
    const { personalChats } = get();
    set({ selectedChatJids: new Set(personalChats.map((c) => c.chatId)) });
  },

  // Deselect all groups
  deselectAllGroups: () => {
    set({ selectedGroupIds: new Set() });
  },

  // Deselect all chats
  deselectAllChats: () => {
    set({ selectedChatJids: new Set() });
  },

  // Extract from selected groups
  extractFromGroups: async (accountId) => {
    const { selectedGroupIds } = get();
    if (selectedGroupIds.size === 0) return;

    set({ isExtracting: true, error: null });
    try {
      const contacts = await window.electronAPI.contact.extractFromGroups(
        accountId,
        Array.from(selectedGroupIds)
      );
      set((state) => ({
        extractedContacts: [...state.extractedContacts, ...contacts],
        isExtracting: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isExtracting: false });
    }
  },

  // Extract from selected chats
  extractFromChats: async (accountId) => {
    const { selectedChatJids } = get();
    if (selectedChatJids.size === 0) return;

    set({ isExtracting: true, error: null });
    try {
      const contacts = await window.electronAPI.contact.extractFromChats(
        accountId,
        Array.from(selectedChatJids)
      );
      set((state) => ({
        extractedContacts: [...state.extractedContacts, ...contacts],
        isExtracting: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isExtracting: false });
    }
  },

  // Extract from both groups and chats
  extractAll: async (accountId) => {
    const { selectedGroupIds, selectedChatJids } = get();

    set({ isExtracting: true, error: null });
    try {
      let contacts: ExtractedContact[] = [];

      if (selectedGroupIds.size > 0) {
        const groupContacts = await window.electronAPI.contact.extractFromGroups(
          accountId,
          Array.from(selectedGroupIds)
        );
        contacts = [...contacts, ...groupContacts];
      }

      if (selectedChatJids.size > 0) {
        const chatContacts = await window.electronAPI.contact.extractFromChats(
          accountId,
          Array.from(selectedChatJids)
        );
        contacts = [...contacts, ...chatContacts];
      }

      set((state) => ({
        extractedContacts: [...state.extractedContacts, ...contacts],
        isExtracting: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isExtracting: false });
    }
  },

  // Set extracted contacts
  setExtractedContacts: (contacts) => {
    set({ extractedContacts: contacts });
  },

  // Deduplicate contacts by phone number
  deduplicateContacts: () => {
    const { extractedContacts } = get();
    const seen = new Map<string, ExtractedContact>();

    for (const contact of extractedContacts) {
      if (!seen.has(contact.phoneNumber)) {
        seen.set(contact.phoneNumber, contact);
      }
    }

    set({ extractedContacts: Array.from(seen.values()) });
  },

  // Clear extracted contacts
  clearExtractedContacts: () => {
    set({ extractedContacts: [] });
  },

  // Remove single contact
  removeContact: (id) => {
    set((state) => ({
      extractedContacts: state.extractedContacts.filter((c) => c.id !== id),
    }));
  },

  // Export to Excel
  exportToExcel: async (options) => {
    const { extractedContacts } = get();
    set({ isExporting: true, error: null });
    try {
      const filePath = await window.electronAPI.contact.exportToExcel({
        contacts: extractedContacts,
        ...options,
      });
      set({ isExporting: false });
      return filePath;
    } catch (error) {
      set({ error: (error as Error).message, isExporting: false });
      throw error;
    }
  },

  // Export group contacts directly (extract + export in one step)
  exportGroupContacts: async (accountId) => {
    const { selectedGroupIds } = get();
    if (selectedGroupIds.size === 0) throw new Error('No groups selected');

    set({ isExporting: true, error: null });
    try {
      const contacts = await window.electronAPI.contact.extractFromGroups(
        accountId,
        Array.from(selectedGroupIds)
      );
      const filePath = await window.electronAPI.contact.exportToExcel({ contacts });
      set({ isExporting: false });
      return filePath;
    } catch (error) {
      set({ error: (error as Error).message, isExporting: false });
      throw error;
    }
  },

  // Export personal contacts directly (extract + export in one step)
  exportPersonalContacts: async (accountId) => {
    const { selectedChatJids } = get();
    if (selectedChatJids.size === 0) throw new Error('No chats selected');

    set({ isExporting: true, error: null });
    try {
      const contacts = await window.electronAPI.contact.extractFromChats(
        accountId,
        Array.from(selectedChatJids)
      );
      const filePath = await window.electronAPI.contact.exportToExcel({ contacts });
      set({ isExporting: false });
      return filePath;
    } catch (error) {
      set({ error: (error as Error).message, isExporting: false });
      throw error;
    }
  },

  // Save contacts to database
  saveContacts: async () => {
    const { extractedContacts } = get();
    try {
      await window.electronAPI.contact.saveContacts(extractedContacts);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Load saved contacts
  loadSavedContacts: async () => {
    try {
      const contacts = await window.electronAPI.contact.getSavedContacts();
      set({ extractedContacts: contacts });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Set error
  setError: (error) => {
    set({ error });
  },
}));
