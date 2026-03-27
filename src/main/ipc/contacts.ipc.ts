import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { contactRepository } from '../database/repositories/contact.repository';
import { contactService } from '../services/whatsapp/contact.service';
import {
  WhatsAppGroup,
  PersonalChat,
  ExtractedContact,
  ExportOptions,
} from '../../shared/types';

export function registerContactIPC(mainWindow: BrowserWindow): void {
  const channels = IPC_CHANNELS.CONTACT;

  // Fetch groups
  ipcMain.handle(
    channels.FETCH_GROUPS,
    async (_, accountId: string): Promise<WhatsAppGroup[]> => {
      return contactService.fetchGroups();
    }
  );

  // Fetch personal chats
  ipcMain.handle(
    channels.FETCH_PERSONAL_CHATS,
    async (_, accountId: string): Promise<PersonalChat[]> => {
      return contactService.fetchPersonalChats();
    }
  );

  // Extract from groups
  ipcMain.handle(
    channels.EXTRACT_FROM_GROUPS,
    async (_, accountId: string, groupIds: string[]): Promise<ExtractedContact[]> => {
      return contactService.extractFromGroups(groupIds);
    }
  );

  // Extract from chats
  ipcMain.handle(
    channels.EXTRACT_FROM_CHATS,
    async (_, accountId: string, chatJids: string[]): Promise<ExtractedContact[]> => {
      return contactService.extractFromChats(chatJids);
    }
  );

  // Export to Excel
  ipcMain.handle(
    channels.EXPORT_TO_EXCEL,
    async (_, options: ExportOptions): Promise<string> => {
      return contactService.exportToExcel(options);
    }
  );

  // Save contacts to database
  ipcMain.handle(
    channels.SAVE_CONTACTS,
    async (_, contacts: ExtractedContact[]): Promise<void> => {
      const contactsToSave = contacts.map((c) => ({
        phoneNumber: c.phoneNumber,
        name: c.name,
        sourceType: c.sourceType,
        sourceName: c.sourceName,
      }));
      contactRepository.saveContacts(contactsToSave);
    }
  );

  // Get saved contacts
  ipcMain.handle(
    channels.GET_SAVED_CONTACTS,
    async (): Promise<ExtractedContact[]> => {
      return contactRepository.getAll();
    }
  );
}
