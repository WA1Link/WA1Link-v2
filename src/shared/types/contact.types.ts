export type ContactSourceType = 'group' | 'chat';

export interface ExtractedContact {
  id: string;
  phoneNumber: string;
  name: string;
  sourceType: ContactSourceType;
  sourceName: string;
  extractedAt: string;
}

export interface WhatsAppGroup {
  id: string;
  name: string;
  participantCount: number;
  isSelected?: boolean;
}

export interface PersonalChat {
  id: string;          // phone number (primary key, dedupe key)
  chatId: string;      // full WhatsApp JID e.g. "994501234567@s.whatsapp.net"
  name: string | null; // display name from WhatsApp, null if unavailable
  isGroup: boolean;
  lastMessage: string | null;
  lastMessageTime: number | null;
  unreadCount: number;
  isSelected?: boolean;
}

export interface ExtractionRequest {
  groupIds?: string[];
  includePersonalChats?: boolean;
  chatJids?: string[];
}

export interface ExtractionProgress {
  total: number;
  processed: number;
  contacts: ExtractedContact[];
}

export interface ExportOptions {
  contacts: ExtractedContact[];
  fileName?: string;
  includeSource?: boolean;
}
