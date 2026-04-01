import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { app, BrowserWindow } from 'electron';
import { ConnectionStatus, Account } from '../../../shared/types';
import { phoneNormalizer } from '../phone/normalizer.service';
import { accountRepository } from '../../database/repositories/account.repository';
import { whatsappChatRepository } from '../../database/repositories/whatsapp-chat.repository';

// Baileys types (we'll import dynamically)
type WASocket = any;
type BaileysEventMap = any;

// Lazy-loaded Baileys module
let baileys: any = null;

// Use Function constructor to bypass TypeScript's require() transformation
async function getBaileys() {
  if (!baileys) {
    // This prevents TypeScript from converting import() to require()
    const importDynamic = new Function('modulePath', 'return import(modulePath)');
    baileys = await importDynamic('@whiskeysockets/baileys');
  }
  return baileys;
}

// In-memory chat entry with message metadata
interface ChatEntry {
  id: string;
  name?: string;
  notify?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: number;
}

// Simple chat store since makeInMemoryStore isn't available in all Baileys versions
interface ChatStore {
  chats: Map<string, ChatEntry>;
}

const chatStore: ChatStore = {
  chats: new Map(),
};

// Get the store
function getStore() {
  return {
    chats: {
      all: () => Array.from(chatStore.chats.values()),
      get: (id: string) => chatStore.chats.get(id),
    },
  };
}

// Logger - use console for now
const logger = { level: 'error', info: () => {}, error: console.error, warn: console.warn, debug: () => {}, trace: () => {}, fatal: console.error, child: () => logger };

// Session directory — store inside Electron's userData so it lives outside the
// project tree (avoids electronmon restart loops on credential file changes).
const getSessionsDir = () => path.join(app.getPath('userData'), 'auth_sessions');

const MAX_BACKOFF_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;

interface SocketState {
  socket: WASocket | null;
  accountId: string | null;
  stopRequested: boolean;
  reconnectAttempt: number;
}

type SocketEventType =
  | 'qr'
  | 'pairing-code'
  | 'status-changed'
  | 'ready'
  | 'disconnected'
  | 'error'
  | 'reconnecting';

interface SocketEventData {
  accountId: string;
  status?: ConnectionStatus;
  qrCode?: string;
  pairingCode?: string;
  error?: string;
  attempt?: number;
  delayMs?: number;
}

export class SocketService extends EventEmitter {
  private state: SocketState = {
    socket: null,
    accountId: null,
    stopRequested: false,
    reconnectAttempt: 0,
  };

  private mainWindow: BrowserWindow | null = null;
  private pairingCodeRequested = false;
  private usePairingCode = false;
  private targetPhoneNumber: string | null = null;

  constructor() {
    super();
  }

  /**
   * Set main window reference for IPC
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Get session path for account
   */
  private sessionPathFor(accountId: string): string {
    return path.join(getSessionsDir(), 'wa1link-whatsapp-auth', accountId);
  }

  /**
   * Delete session folder
   */
  private async deleteSessionFolder(accountId: string): Promise<void> {
    try {
      await fs.rm(this.sessionPathFor(accountId), { recursive: true, force: true });
    } catch {}
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Add jitter to delay
   */
  private withJitter(ms: number): number {
    const delta = Math.floor(ms * 0.2);
    return ms + Math.floor(Math.random() * (2 * delta + 1)) - delta;
  }

  /**
   * Emit typed event
   */
  private emitSocketEvent(event: SocketEventType, data: SocketEventData): void {
    this.emit(event, data);
  }

  /**
   * Connect to WhatsApp for an account
   */
  async connect(
    account: Account,
    usePairingCode: boolean = false,
    phoneNumber?: string
  ): Promise<void> {
    // If already connected to same account, skip
    if (this.state.accountId === account.id && this.state.socket) {
      return;
    }

    // Stop any existing connection
    await this.disconnect();

    this.state.stopRequested = false;
    this.state.accountId = account.id;
    this.state.reconnectAttempt = 0;
    this.usePairingCode = usePairingCode;
    this.pairingCodeRequested = false;
    this.targetPhoneNumber = phoneNumber ?? account.phoneNumber;

    // Validate phone number if using pairing code
    if (usePairingCode && this.targetPhoneNumber) {
      const validation = phoneNormalizer.validate(this.targetPhoneNumber);
      if (!validation.valid) {
        this.emitSocketEvent('error', {
          accountId: account.id,
          error: `Invalid phone number: ${validation.error}`,
        });
        return;
      }
    }

    await this.startSocket(account);
  }

  /**
   * Start WhatsApp socket
   */
  private async startSocket(account: Account): Promise<void> {
    const baileysModule = await getBaileys();
    const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = baileysModule;

    const sessionDir = this.sessionPathFor(account.id);
    await fs.mkdir(sessionDir, { recursive: true });

    const { state: authState, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    // Load persisted chats from DB into memory store
    chatStore.chats.clear();
    try {
      const savedChats = whatsappChatRepository.getByAccount(account.id);
      for (const row of savedChats) {
        chatStore.chats.set(row.jid, {
          id: row.jid,
          name: row.name ?? undefined,
          notify: row.notify ?? undefined,
          lastMessage: row.last_message ?? undefined,
          lastMessageTime: row.last_message_time ?? undefined,
          unreadCount: row.unread_count ?? undefined,
        });
      }
      console.log(`[SocketService] Loaded ${savedChats.length} persisted chats from DB for account ${account.id}`);
    } catch (err) {
      console.log('[SocketService] Could not load persisted chats:', err);
    }

    this.emitSocketEvent('status-changed', {
      accountId: account.id,
      status: 'connecting',
    });

    const socket = makeWASocket({
      auth: authState,
      logger,
      fireInitQueries: true,
      connectTimeoutMs: 60_000,
      keepAliveIntervalMs: 20_000,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      syncFullHistory: true,
      version,
    });


    this.state.socket = socket;

    // Handle credentials update
    socket.ev.on('creds.update', saveCreds);

    // Handle connection updates
    socket.ev.on('connection.update', async (update: any) => {
      await this.handleConnectionUpdate(update, account);
    });

    // Extract last message text from a Baileys message object
    const extractMessageText = (msg: any): string | null => {
      if (!msg) return null;
      const m = msg.message;
      if (!m) return null;
      return m.conversation
        || m.extendedTextMessage?.text
        || m.imageMessage?.caption
        || m.videoMessage?.caption
        || m.documentMessage?.caption
        || (m.imageMessage ? '[Image]' : null)
        || (m.videoMessage ? '[Video]' : null)
        || (m.audioMessage ? '[Audio]' : null)
        || (m.stickerMessage ? '[Sticker]' : null)
        || (m.documentMessage ? '[Document]' : null)
        || (m.contactMessage ? '[Contact]' : null)
        || (m.locationMessage ? '[Location]' : null)
        || null;
    };

    // Helper: persist chats batch to DB
    const persistChats = (items: ChatEntry[]) => {
      if (!account.id || items.length === 0) return;
      try {
        whatsappChatRepository.upsertBatch(account.id, items);
      } catch (err) {
        console.error('[SocketService] Failed to persist chats to DB:', err);
      }
    };

    // Helper: update memory store + persist single chat
    const upsertChat = (
      id: string,
      name?: string,
      notify?: string,
      lastMessage?: string,
      lastMessageTime?: number,
      unreadCount?: number
    ) => {
      const existing = chatStore.chats.get(id);
      if (existing) {
        if (name) existing.name = name;
        if (notify) existing.notify = notify;
        if (lastMessage !== undefined) existing.lastMessage = lastMessage;
        if (lastMessageTime !== undefined) existing.lastMessageTime = lastMessageTime;
        if (unreadCount !== undefined) existing.unreadCount = unreadCount;
      } else {
        chatStore.chats.set(id, { id, name, notify, lastMessage, lastMessageTime, unreadCount });
      }
    };

    // Store chats when history is synced
    socket.ev.on('messaging-history.set', ({ chats, contacts, messages, isLatest }: any) => {
      console.log(`[SocketService] History sync: ${chats?.length || 0} chats, ${contacts?.length || 0} contacts, isLatest: ${isLatest}`);

      if (chats && Array.isArray(chats)) {
        const enriched: ChatEntry[] = [];
        for (const chat of chats) {
          if (chat.id) {
            const ts = chat.conversationTimestamp
              ? (typeof chat.conversationTimestamp === 'object'
                ? Number(chat.conversationTimestamp.low || chat.conversationTimestamp)
                : Number(chat.conversationTimestamp))
              : undefined;
            const lastMsg = extractMessageText(chat.messages?.[0]);
            const unread = chat.unreadCount ?? undefined;
            upsertChat(chat.id, chat.name, chat.notify, lastMsg ?? undefined, ts, unread);
            enriched.push({
              id: chat.id,
              name: chat.name,
              notify: chat.notify,
              lastMessage: lastMsg ?? undefined,
              lastMessageTime: ts,
              unreadCount: unread,
            });
          }
        }
        persistChats(enriched);
        console.log(`[SocketService] Stored ${chatStore.chats.size} total chats`);
      }

      if (contacts && Array.isArray(contacts)) {
        const contactEntries: ChatEntry[] = [];
        for (const contact of contacts) {
          if (contact.id) {
            upsertChat(contact.id, contact.name, contact.notify);
            contactEntries.push({ id: contact.id, name: contact.name, notify: contact.notify });
          }
        }
        persistChats(contactEntries);
      }
    });

    // Helper: extract metadata from a Baileys chat object
    const chatToEntry = (chat: any): ChatEntry | null => {
      if (!chat.id) return null;
      const ts = chat.conversationTimestamp
        ? (typeof chat.conversationTimestamp === 'object'
          ? Number(chat.conversationTimestamp.low || chat.conversationTimestamp)
          : Number(chat.conversationTimestamp))
        : undefined;
      const lastMsg = extractMessageText(chat.messages?.[0]) ?? undefined;
      const unread = chat.unreadCount ?? undefined;
      return {
        id: chat.id,
        name: chat.name,
        notify: chat.notify,
        lastMessage: lastMsg,
        lastMessageTime: ts,
        unreadCount: unread,
      };
    };

    // Store chats when set
    socket.ev.on('chats.set', ({ chats }: any) => {
      console.log(`[SocketService] Chats set: ${chats?.length || 0} chats`);
      if (chats && Array.isArray(chats)) {
        const entries: ChatEntry[] = [];
        for (const chat of chats) {
          const entry = chatToEntry(chat);
          if (entry) {
            upsertChat(entry.id, entry.name, entry.notify, entry.lastMessage, entry.lastMessageTime, entry.unreadCount);
            entries.push(entry);
          }
        }
        persistChats(entries);
        console.log(`[SocketService] Total chats in store: ${chatStore.chats.size}`);
      }
    });

    // Store chats from upsert events
    socket.ev.on('chats.upsert', (chats: any[]) => {
      console.log(`[SocketService] Chats upsert: ${chats?.length || 0} chats`);
      if (chats && Array.isArray(chats)) {
        const entries: ChatEntry[] = [];
        for (const chat of chats) {
          const entry = chatToEntry(chat);
          if (entry) {
            upsertChat(entry.id, entry.name, entry.notify, entry.lastMessage, entry.lastMessageTime, entry.unreadCount);
            entries.push(entry);
          }
        }
        persistChats(entries);
      }
    });

    // Store contacts when received
    socket.ev.on('contacts.set', ({ contacts }: any) => {
      console.log(`[SocketService] Contacts set: ${contacts?.length || 0} contacts`);
      if (contacts && Array.isArray(contacts)) {
        const entries: ChatEntry[] = [];
        for (const contact of contacts) {
          if (contact.id && (contact.name || contact.notify)) {
            upsertChat(contact.id, contact.name, contact.notify);
            entries.push({ id: contact.id, name: contact.name, notify: contact.notify });
          }
        }
        persistChats(entries);
      }
    });

    // Handle contacts upsert
    socket.ev.on('contacts.upsert', (contacts: any[]) => {
      console.log(`[SocketService] Contacts upsert: ${contacts?.length || 0} contacts`);
      if (contacts && Array.isArray(contacts)) {
        const entries: ChatEntry[] = [];
        for (const contact of contacts) {
          if (contact.id) {
            upsertChat(contact.id, contact.name, contact.notify);
            entries.push({ id: contact.id, name: contact.name, notify: contact.notify });
          }
        }
        persistChats(entries);
      }
    });

    // Handle contacts update (name changes, profile updates)
    socket.ev.on('contacts.update', (updates: any[]) => {
      console.log(`[SocketService] Contacts update: ${updates?.length || 0} contacts`);
      if (updates && Array.isArray(updates)) {
        for (const update of updates) {
          if (update.id) {
            upsertChat(update.id, update.name, update.notify);
            try {
              whatsappChatRepository.upsert(account.id, update.id, update.name, update.notify);
            } catch {}
          }
        }
      }
    });

    // Handle chats update (conversation name changes, unread counts)
    socket.ev.on('chats.update', (updates: any[]) => {
      console.log(`[SocketService] Chats update: ${updates?.length || 0} chats`);
      if (updates && Array.isArray(updates)) {
        for (const update of updates) {
          if (update.id) {
            const ts = update.conversationTimestamp
              ? (typeof update.conversationTimestamp === 'object'
                ? Number(update.conversationTimestamp.low || update.conversationTimestamp)
                : Number(update.conversationTimestamp))
              : undefined;
            const unread = update.unreadCount ?? undefined;
            upsertChat(update.id, update.name, update.notify, undefined, ts, unread);
            try {
              whatsappChatRepository.upsert(
                account.id, update.id, update.name, update.notify,
                undefined, ts, unread
              );
            } catch {}
          }
        }
      }
    });

    // Handle incoming messages to update last message on chats
    socket.ev.on('messages.upsert', ({ messages: msgs, type }: any) => {
      if (!msgs || !Array.isArray(msgs)) return;
      for (const msg of msgs) {
        const jid = msg.key?.remoteJid;
        if (!jid || jid === 'status@broadcast') continue;
        const text = extractMessageText(msg) ?? undefined;
        const ts = msg.messageTimestamp
          ? (typeof msg.messageTimestamp === 'object'
            ? Number(msg.messageTimestamp.low || msg.messageTimestamp)
            : Number(msg.messageTimestamp))
          : undefined;
        upsertChat(jid, undefined, undefined, text, ts);
        try {
          whatsappChatRepository.upsert(account.id, jid, undefined, undefined, text, ts);
        } catch {}
      }
    });
  }

  /**
   * Handle connection state updates
   */
  private async handleConnectionUpdate(
    update: any,
    account: Account
  ): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    // Handle QR code
    if (qr && !this.usePairingCode) {
      this.emitSocketEvent('qr', {
        accountId: account.id,
        qrCode: qr,
        status: 'qr_ready',
      });
      this.emitSocketEvent('status-changed', {
        accountId: account.id,
        status: 'qr_ready',
      });
    }

    // Handle pairing code request
    if (this.usePairingCode && !this.pairingCodeRequested && connection === undefined) {
      await this.requestPairingCode(account);
    }

    // Handle successful connection
    if (connection === 'open') {
      await this.handleConnected(account);
    }

    // Handle disconnection
    if (connection === 'close') {
      await this.handleDisconnected(account, lastDisconnect?.error);
    }
  }

  /**
   * Request pairing code from WhatsApp
   */
  private async requestPairingCode(account: Account): Promise<void> {
    if (!this.state.socket || !this.targetPhoneNumber) return;
    if (this.state.socket.authState.creds.registered) return;

    try {
      if (this.state.stopRequested) return;

      const normalized = phoneNormalizer.normalize(this.targetPhoneNumber);
      if (!normalized) {
        throw new Error('Invalid phone number');
      }

      const code = await this.state.socket.requestPairingCode(normalized.full);
      this.pairingCodeRequested = true;

      this.emitSocketEvent('pairing-code', {
        accountId: account.id,
        pairingCode: code,
      });
    } catch (error: any) {
      this.emitSocketEvent('error', {
        accountId: account.id,
        error: `Pairing failed: ${error.message}`,
      });
    }
  }

  /**
   * Handle successful connection
   */
  private async handleConnected(account: Account): Promise<void> {
    if (!this.state.socket?.user) return;

    const jid = this.state.socket.user.id;
    const connectedPhone = jid.split('@')[0].split(':')[0];

    // Update account with verified phone number
    accountRepository.update({
      id: account.id,
      phoneNumber: connectedPhone,
      isVerified: true,
    });

    this.state.reconnectAttempt = 0;

    this.emitSocketEvent('status-changed', {
      accountId: account.id,
      status: 'connected',
    });

    this.emitSocketEvent('ready', {
      accountId: account.id,
    });
  }

  /**
   * Handle disconnection
   */
  private async handleDisconnected(account: Account, error?: Error): Promise<void> {
    const { DisconnectReason } = await getBaileys();

    // Ignore if stop was requested or account changed (stale handler)
    if (this.state.stopRequested) return;
    if (this.state.accountId !== account.id) return;

    const errorData = error as any;
    const code = errorData?.output?.statusCode ??
                 errorData?.statusCode ??
                 errorData?.code ??
                 errorData?.data?.statusCode;

    this.emitSocketEvent('status-changed', {
      accountId: account.id,
      status: 'disconnected',
    });

    switch (code) {
      case DisconnectReason.loggedOut:
      case 401:
        // Session invalid - delete and require re-auth
        await this.deleteSessionFolder(account.id);
        this.emitSocketEvent('status-changed', {
          accountId: account.id,
          status: 'logged_out',
        });
        break;

      case DisconnectReason.connectionReplaced:
        // Another client took over
        this.emitSocketEvent('error', {
          accountId: account.id,
          error: 'Connection replaced by another device',
        });
        return;

      case 428:
        // Connection terminated
        this.emitSocketEvent('error', {
          accountId: account.id,
          error: 'Connection terminated',
        });
        return;

      case DisconnectReason.restartRequired:
      case DisconnectReason.timedOut:
      case DisconnectReason.connectionLost:
      case 408:
      case 429:
      case 500:
      case 502:
      case 503:
      case 504:
      default:
        // Attempt reconnection with backoff
        this.scheduleReconnect(account);
        break;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(account: Account): void {
    if (this.state.stopRequested) return;
    if (this.state.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      this.emitSocketEvent('error', {
        accountId: account.id,
        error: `Reconnect failed after ${MAX_RECONNECT_ATTEMPTS} attempts`,
      });
      return;
    }

    this.state.reconnectAttempt++;
    const base = Math.min(1000 * Math.pow(2, this.state.reconnectAttempt - 1), MAX_BACKOFF_MS);
    const delayMs = this.withJitter(base);

    this.emitSocketEvent('reconnecting', {
      accountId: account.id,
      attempt: this.state.reconnectAttempt,
      delayMs,
    });

    setTimeout(async () => {
      if (this.state.stopRequested) return;
      if (this.state.accountId !== account.id) return;

      try {
        await this.startSocket(account);
      } catch (error) {
        this.scheduleReconnect(account);
      }
    }, delayMs);
  }

  /**
   * Remove all event listeners from the current socket
   */
  private cleanupSocket(): void {
    if (this.state.socket?.ev) {
      try {
        this.state.socket.ev.removeAllListeners('creds.update');
        this.state.socket.ev.removeAllListeners('connection.update');
        this.state.socket.ev.removeAllListeners('messaging-history.set');
        this.state.socket.ev.removeAllListeners('chats.set');
        this.state.socket.ev.removeAllListeners('chats.upsert');
        this.state.socket.ev.removeAllListeners('chats.update');
        this.state.socket.ev.removeAllListeners('contacts.set');
        this.state.socket.ev.removeAllListeners('contacts.upsert');
        this.state.socket.ev.removeAllListeners('contacts.update');
        this.state.socket.ev.removeAllListeners('messages.upsert');
      } catch {}
    }
  }

  /**
   * Disconnect from WhatsApp
   */
  async disconnect(): Promise<void> {
    this.state.stopRequested = true;

    this.cleanupSocket();

    try {
      if (this.state.socket?.end) {
        this.state.socket.end(undefined);
      }
    } catch {}

    const accountId = this.state.accountId;
    this.state.socket = null;
    this.state.accountId = null;

    if (accountId) {
      this.emitSocketEvent('status-changed', {
        accountId,
        status: 'disconnected',
      });
    }
  }

  /**
   * Logout and delete session
   */
  async logout(accountId: string): Promise<void> {
    this.state.stopRequested = true;

    // Remove listeners BEFORE calling logout to prevent stale event handlers
    this.cleanupSocket();

    try {
      if (this.state.socket?.logout) {
        await this.state.socket.logout();
      }
    } catch {}

    try {
      if (this.state.socket?.end) {
        this.state.socket.end(undefined);
      }
    } catch {}

    this.state.socket = null;
    this.state.accountId = null;
    this.state.reconnectAttempt = 0;

    await this.deleteSessionFolder(accountId);

    this.emitSocketEvent('status-changed', {
      accountId,
      status: 'disconnected',
    });
  }

  /**
   * Get the active socket
   */
  getSocket(): WASocket | null {
    return this.state.socket;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return Boolean(this.state.socket?.user);
  }

  /**
   * Get active account ID
   */
  getActiveAccountId(): string | null {
    return this.state.accountId;
  }

  /**
   * Get connected phone number
   */
  getConnectedPhoneNumber(): string | null {
    if (!this.state.socket?.user) return null;
    return this.state.socket.user.id.split('@')[0].split(':')[0];
  }

  /**
   * Get the chat store (for accessing chats)
   */
  getStore(): any {
    return getStore();
  }
}

export const socketService = new SocketService();
