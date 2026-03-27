import React, { useState } from 'react';
import { PersonalChat } from '../../../shared/types';
import { Button } from '../ui/Button';

interface ChatSelectorProps {
  chats: PersonalChat[];
  selectedJids: Set<string>;
  isLoading: boolean;
  onToggle: (chatJid: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRefresh: () => void;
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return '';
  const date = new Date(ts * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export const ChatSelector: React.FC<ChatSelectorProps> = ({
  chats,
  selectedJids,
  isLoading,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');

  const filteredChats = chats.filter((chat) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const nameMatch = chat.name?.toLowerCase().includes(q);
    const phoneMatch = chat.id.includes(q);
    return nameMatch || phoneMatch;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-900">Personal Contacts</h3>
          <p className="text-sm text-gray-500">
            {selectedJids.size} of {chats.length} selected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={onDeselectAll}>
            Clear
          </Button>
          <Button variant="secondary" size="sm" onClick={onRefresh} isLoading={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      {chats.length > 0 && (
        <div className="relative mb-4">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-light focus:border-whatsapp-light"
          />
        </div>
      )}

      {/* Contact List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg
            className="animate-spin h-8 w-8 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : chats.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="mt-2 font-medium">No personal chats found</p>
          <p className="text-sm mt-1">Chat history syncs after connecting.</p>
          <p className="text-sm">Click Refresh to check for new chats.</p>
        </div>
      ) : filteredChats.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="font-medium">No contacts match your search</p>
          <p className="text-sm mt-1">Try a different name or number.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredChats.map((chat) => {
            const isSelected = selectedJids.has(chat.chatId);
            const displayName = chat.name || chat.id;
            const timeStr = formatTimestamp(chat.lastMessageTime);

            return (
              <label
                key={chat.chatId}
                className={`
                  flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                  ${isSelected ? 'bg-whatsapp-light bg-opacity-10' : 'hover:bg-gray-50'}
                `}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(chat.chatId)}
                  className="w-5 h-5 rounded border-gray-300 text-whatsapp-light focus:ring-whatsapp-light flex-shrink-0"
                />
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium flex-shrink-0 relative">
                  {displayName.charAt(0).toUpperCase()}
                  {chat.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-whatsapp-light text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 truncate">{displayName}</p>
                    {timeStr && (
                      <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {timeStr}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 font-mono truncate mt-0.5">+{chat.id}</p>
                  {chat.lastMessage && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{chat.lastMessage}</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {filteredChats.length > 0 && (
        <div className="mt-3 pt-3 border-t text-xs text-gray-400 text-center">
          Showing {filteredChats.length} of {chats.length} contacts
        </div>
      )}
    </div>
  );
};
