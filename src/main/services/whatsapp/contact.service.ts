import * as XLSX from 'xlsx';
import path from 'path';
import { app, dialog } from 'electron';
import { socketService } from './socket.service';
import { phoneNormalizer } from '../phone/normalizer.service';
import { whatsappChatRepository } from '../../database/repositories/whatsapp-chat.repository';
import {
  ExtractedContact,
  WhatsAppGroup,
  PersonalChat,
  ExportOptions,
} from '../../../shared/types';

export class ContactService {
  /**
   * Fetch all groups the user is part of
   */
  async fetchGroups(): Promise<WhatsAppGroup[]> {
    console.log('[ContactService] fetchGroups called');
    const socket = socketService.getSocket();
    console.log('[ContactService] socket:', socket ? 'connected' : 'null');

    if (!socket) {
      throw new Error('Socket is not connected');
    }

    try {
      console.log('[ContactService] calling groupFetchAllParticipating...');
      const groups = await socket.groupFetchAllParticipating();
      console.log('[ContactService] groups fetched:', Object.keys(groups).length);

      const result = Object.entries(groups).map(([id, group]: [string, any]) => ({
        id,
        name: group.subject,
        participantCount: group.participants?.length ?? 0,
      }));

      console.log('[ContactService] returning', result.length, 'groups');
      return result;
    } catch (error) {
      console.error('[ContactService] fetchGroups error:', error);
      throw new Error(`Failed to fetch groups: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch ALL personal chats as contacts.
   * Every chat = one contact. No saved/unsaved distinction.
   * Merges DB (persisted across sessions) with in-memory store (current session).
   * Deduplicates by phone number, sorted by lastMessageTime descending.
   */
  async fetchPersonalChats(): Promise<PersonalChat[]> {
    console.log('[ContactService] fetchPersonalChats called');

    // Use chatId (JID) as the merge key, then dedupe by phone number at the end
    const chatMap = new Map<string, PersonalChat>();

    // 1. Load from DB (persisted chats from previous sessions)
    const accountId = socketService.getActiveAccountId();
    if (accountId) {
      try {
        const dbChats = whatsappChatRepository.getPersonalChatsByAccount(accountId);
        console.log('[ContactService] DB chats loaded:', dbChats.length);

        for (const row of dbChats) {
          if (!row.jid || typeof row.jid !== 'string') continue;
          const phoneNumber = phoneNormalizer.fromJID(row.jid);
          chatMap.set(row.jid, {
            id: phoneNumber,
            chatId: row.jid,
            name: row.name || row.notify || null,
            isGroup: false,
            lastMessage: row.last_message || null,
            lastMessageTime: row.last_message_time || null,
            unreadCount: row.unread_count || 0,
          });
        }
      } catch (err) {
        console.log('[ContactService] Could not load from DB:', err);
      }
    }

    // 2. Overlay with in-memory store (current session has fresher data)
    const store = socketService.getStore();
    if (store?.chats) {
      let allChats: any[] = [];
      try {
        allChats = store.chats.all?.() ?? [];
      } catch (err) {
        console.error('[ContactService] Failed to read in-memory chats:', err);
      }
      console.log('[ContactService] in-memory chats scanned:', allChats.length);

      let validCount = 0;
      let skippedCount = 0;

      for (const chat of allChats) {
        try {
          const jid = chat?.id;

          // Safe guard: skip entries with missing or invalid JID
          if (!jid || typeof jid !== 'string') {
            skippedCount++;
            continue;
          }

          // @s.whatsapp.net = personal chat, skip groups (@g.us) and others
          if (!jid.endsWith('@s.whatsapp.net')) {
            skippedCount++;
            continue;
          }

          const phoneNumber = phoneNormalizer.fromJID(jid);
          const existing = chatMap.get(jid);

          chatMap.set(jid, {
            id: phoneNumber,
            chatId: jid,
            name: chat.name || chat.notify || existing?.name || null,
            isGroup: false,
            lastMessage: chat.lastMessage ?? existing?.lastMessage ?? null,
            lastMessageTime: chat.lastMessageTime ?? existing?.lastMessageTime ?? null,
            unreadCount: chat.unreadCount ?? existing?.unreadCount ?? 0,
          });
          validCount++;
        } catch (err) {
          console.error('[ContactService] Error processing chat entry:', err);
          skippedCount++;
        }
      }

      console.log(`[ContactService] in-memory chats: ${validCount} valid, ${skippedCount} skipped`);
    }

    // 3. Deduplicate by phone number (id), keep the one with latest message
    const byPhone = new Map<string, PersonalChat>();
    for (const chat of chatMap.values()) {
      const existing = byPhone.get(chat.id);
      if (!existing || (chat.lastMessageTime ?? 0) > (existing.lastMessageTime ?? 0)) {
        byPhone.set(chat.id, chat);
      }
    }

    // 4. Sort by lastMessageTime descending
    const result = Array.from(byPhone.values())
      .sort((a, b) => (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0));

    console.log('[ContactService] returning', result.length, 'contacts (total chats scanned:', chatMap.size, ', unique phones:', byPhone.size, ')');
    return result;
  }

  /**
   * Try to resolve LID to phone number using store contacts
   */
  private tryResolveLidToPhone(lid: string): string | null {
    const store = socketService.getStore();
    if (!store?.contacts) return null;

    // Check if store has a mapping for this LID
    const contacts = store.contacts.all?.() || Object.values(store.contacts || {});
    for (const contact of contacts) {
      if ((contact as any).lid === lid || (contact as any).id === lid) {
        const phoneJid = (contact as any).jid || (contact as any).phone || (contact as any).id;
        if (phoneJid?.endsWith('@s.whatsapp.net')) {
          return phoneJid;
        }
      }
    }
    return null;
  }

  /**
   * Extract contacts from selected groups
   */
  async extractFromGroups(groupIds: string[]): Promise<ExtractedContact[]> {
    const socket = socketService.getSocket();
    if (!socket) {
      throw new Error('Socket is not connected');
    }

    const contacts: ExtractedContact[] = [];
    const seenPhones = new Set<string>();

    // Log store info for debugging
    const store = socketService.getStore();
    console.log(`[ContactService] Store contacts available:`, store?.contacts ? 'yes' : 'no');

    for (const groupId of groupIds) {
      try {
        const metadata = await socket.groupMetadata(groupId);
        console.log(`[ContactService] Group ${metadata.subject}: ${metadata.participants.length} participants`);

        for (const participant of metadata.participants) {
          try {
            let jid = participant?.id;

            // Safe guard: skip participants with missing or invalid ID
            if (!jid || typeof jid !== 'string') {
              console.log(`[ContactService] Skipping participant with invalid id:`, jid);
              continue;
            }

            // Check if participant has phone number in a different field
            // Some Baileys versions provide both lid and phone separately
            const phoneJid = (participant as any).phone ||
                            (participant as any).phoneNumber ||
                            (participant as any).jid;

            if (phoneJid && typeof phoneJid === 'string' && phoneJid.endsWith('@s.whatsapp.net')) {
              jid = phoneJid;
            }

            // Try to resolve LID to phone number using store
            if (jid.endsWith('@lid')) {
              const resolvedPhone = this.tryResolveLidToPhone(jid);
              if (resolvedPhone) {
                jid = resolvedPhone;
              } else {
                continue;
              }
            }

            // Only process participants with phone number format (@s.whatsapp.net)
            if (!jid.endsWith('@s.whatsapp.net')) {
              continue;
            }

            const phoneNumber = phoneNormalizer.fromJID(jid);

            // Skip duplicates
            if (seenPhones.has(phoneNumber)) continue;
            seenPhones.add(phoneNumber);

            contacts.push({
              id: `${Date.now()}-${phoneNumber}`,
              phoneNumber,
              name: (participant as any).notify || phoneNumber,
              sourceType: 'group',
              sourceName: metadata.subject,
              extractedAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error(`[ContactService] Error processing participant:`, err);
          }
        }
      } catch (error) {
        console.error(`Failed to extract from group ${groupId}:`, error);
      }
    }

    console.log(`[ContactService] Total contacts extracted from groups: ${contacts.length} (${seenPhones.size} unique phones)`);
    return contacts;
  }

  /**
   * Extract contacts from personal chats with names
   */
  async extractFromChats(chatJids: string[]): Promise<ExtractedContact[]> {
    const contacts: ExtractedContact[] = [];
    const seenPhones = new Set<string>();
    const store = socketService.getStore();

    // Build a map of jid -> name from DB + memory store
    const nameMap = new Map<string, string>();

    // Load from DB first
    const accountId = socketService.getActiveAccountId();
    if (accountId) {
      try {
        const dbChats = whatsappChatRepository.getByAccount(accountId);
        for (const row of dbChats) {
          if (row.name || row.notify) {
            nameMap.set(row.jid, row.name || row.notify || '');
          }
        }
      } catch {}
    }

    // Overlay with memory store (fresher)
    if (store?.chats) {
      const allChats = store.chats.all();
      for (const chat of allChats) {
        if (chat.name || chat.notify) {
          nameMap.set(chat.id, chat.name || chat.notify);
        }
      }
    }

    let skippedCount = 0;
    for (const jid of chatJids) {
      try {
        // Safe guard: skip entries with missing or invalid JID
        if (!jid || typeof jid !== 'string') {
          skippedCount++;
          continue;
        }

        // Only process personal chats with phone numbers
        if (!jid.endsWith('@s.whatsapp.net')) {
          skippedCount++;
          continue;
        }

        const phoneNumber = phoneNormalizer.fromJID(jid);

        // Skip duplicates
        if (seenPhones.has(phoneNumber)) continue;
        seenPhones.add(phoneNumber);

        // Get name from store or use phone number
        const name = nameMap.get(jid) || phoneNumber;

        contacts.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          phoneNumber,
          name,
          sourceType: 'chat',
          sourceName: 'Personal Chat',
          extractedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`[ContactService] Error processing chat JID:`, err);
        skippedCount++;
      }
    }

    console.log(`[ContactService] Extracted ${contacts.length} contacts from personal chats (${skippedCount} skipped)`);
    return contacts;
  }

  /**
   * Deduplicate contacts by phone number
   */
  deduplicateContacts(contacts: ExtractedContact[]): ExtractedContact[] {
    const seen = new Map<string, ExtractedContact>();

    for (const contact of contacts) {
      const normalized = phoneNormalizer.normalize(contact.phoneNumber);
      const key = normalized?.full ?? contact.phoneNumber;

      if (!seen.has(key)) {
        seen.set(key, contact);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Export contacts to Excel file
   */
  async exportToExcel(options: ExportOptions): Promise<string> {
    const { contacts, fileName, includeSource = true } = options;

    // Prepare data for Excel
    const data = contacts.map((contact) => {
      const row: Record<string, string> = {
        Number: contact.phoneNumber,
        Name: contact.name,
      };

      if (includeSource) {
        row['Source Type'] = contact.sourceType;
        row['Source Name'] = contact.sourceName;
        row['Extracted At'] = contact.extractedAt;
      }

      return row;
    });

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Number
      { wch: 30 }, // Name
      { wch: 15 }, // Source Type
      { wch: 30 }, // Source Name
      { wch: 25 }, // Extracted At
    ];

    // Generate file name
    const defaultFileName = fileName ?? `contacts_${Date.now()}.xlsx`;

    // Show save dialog
    const result = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('downloads'), defaultFileName),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    });

    if (result.canceled || !result.filePath) {
      return '';
    }

    // Write file
    XLSX.writeFile(workbook, result.filePath);

    return result.filePath;
  }
}

export const contactService = new ContactService();
