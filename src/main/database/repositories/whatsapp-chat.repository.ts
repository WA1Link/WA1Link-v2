import { getDatabase } from '../index';

export interface WhatsAppChatRow {
  jid: string;
  account_id: string;
  name: string | null;
  notify: string | null;
  last_message: string | null;
  last_message_time: number | null;
  unread_count: number;
  updated_at: string;
}

export interface ChatUpsertData {
  id: string;
  name?: string;
  notify?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: number;
}

export class WhatsAppChatRepository {
  /**
   * Upsert a batch of chats for an account
   */
  upsertBatch(accountId: string, chats: ChatUpsertData[]): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO whatsapp_chats (jid, account_id, name, notify, last_message, last_message_time, unread_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(jid, account_id) DO UPDATE SET
        name = COALESCE(excluded.name, whatsapp_chats.name),
        notify = COALESCE(excluded.notify, whatsapp_chats.notify),
        last_message = COALESCE(excluded.last_message, whatsapp_chats.last_message),
        last_message_time = COALESCE(excluded.last_message_time, whatsapp_chats.last_message_time),
        unread_count = COALESCE(excluded.unread_count, whatsapp_chats.unread_count),
        updated_at = CURRENT_TIMESTAMP
    `);

    const tx = db.transaction(() => {
      for (const chat of chats) {
        if (chat.id) {
          stmt.run(
            chat.id,
            accountId,
            chat.name ?? null,
            chat.notify ?? null,
            chat.lastMessage ?? null,
            chat.lastMessageTime ?? null,
            chat.unreadCount ?? null
          );
        }
      }
    });
    tx();
  }

  /**
   * Upsert a single chat
   */
  upsert(
    accountId: string,
    jid: string,
    name?: string,
    notify?: string,
    lastMessage?: string,
    lastMessageTime?: number,
    unreadCount?: number
  ): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO whatsapp_chats (jid, account_id, name, notify, last_message, last_message_time, unread_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(jid, account_id) DO UPDATE SET
        name = COALESCE(excluded.name, whatsapp_chats.name),
        notify = COALESCE(excluded.notify, whatsapp_chats.notify),
        last_message = COALESCE(excluded.last_message, whatsapp_chats.last_message),
        last_message_time = COALESCE(excluded.last_message_time, whatsapp_chats.last_message_time),
        unread_count = COALESCE(excluded.unread_count, whatsapp_chats.unread_count),
        updated_at = CURRENT_TIMESTAMP
    `).run(
      jid,
      accountId,
      name ?? null,
      notify ?? null,
      lastMessage ?? null,
      lastMessageTime ?? null,
      unreadCount ?? null
    );
  }

  /**
   * Get all chats for an account
   */
  getByAccount(accountId: string): WhatsAppChatRow[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM whatsapp_chats WHERE account_id = ? ORDER BY last_message_time DESC, updated_at DESC')
      .all(accountId) as WhatsAppChatRow[];
  }

  /**
   * Get personal chats (non-group) for an account
   */
  getPersonalChatsByAccount(accountId: string): WhatsAppChatRow[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM whatsapp_chats
      WHERE account_id = ? AND jid LIKE '%@s.whatsapp.net'
      ORDER BY last_message_time DESC, updated_at DESC
    `).all(accountId) as WhatsAppChatRow[];
  }

  /**
   * Delete all chats for an account
   */
  deleteByAccount(accountId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM whatsapp_chats WHERE account_id = ?').run(accountId);
  }

  /**
   * Get chat count for an account
   */
  countByAccount(accountId: string): number {
    const db = getDatabase();
    return (db.prepare('SELECT COUNT(*) as count FROM whatsapp_chats WHERE account_id = ?')
      .get(accountId) as { count: number }).count;
  }
}

export const whatsappChatRepository = new WhatsAppChatRepository();
