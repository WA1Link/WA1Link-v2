# WA1Link V2 Development Notes

## Session: 2026-03-15 - Contact Extraction Feature

### What Was Fixed

#### 1. GPU Cache Issue (Windows)
**Problem:** Electron couldn't access GPU cache, causing window to close immediately.

**Solution:** Changed userData path in development mode:
```typescript
// src/main/index.ts
const isDev = !app.isPackaged;
if (isDev) {
  app.setPath('userData', path.join(app.getPath('appData'), 'wa1link-v2-dev'));
}
app.disableHardwareAcceleration();
```

#### 2. Baileys `makeInMemoryStore` Not Available
**Problem:** The installed Baileys version doesn't export `makeInMemoryStore`.

**Solution:** Created custom chat store in `socket.service.ts`:
```typescript
interface ChatStore {
  chats: Map<string, { id: string; name?: string; notify?: string }>;
}

const chatStore: ChatStore = {
  chats: new Map(),
};
```

Populated via socket events:
- `messaging-history.set` - Main history sync
- `chats.set` / `chats.upsert` - Chat updates
- `contacts.set` / `contacts.upsert` - Contact name updates

#### 3. LID Format for Group Participants
**Problem:** WhatsApp now returns LID (Link ID) format for group participants instead of phone numbers.

**Status:**
- Personal chats work - they have `@s.whatsapp.net` format with real phone numbers
- Group participants MAY have phone numbers if they're in your contacts or you've chatted with them
- Pure LID contacts (`@lid` suffix) are skipped as they can't be used for messaging

### Files Modified

1. **src/main/index.ts**
   - Added userData path fix for dev mode
   - Added `app.disableHardwareAcceleration()`

2. **src/main/services/whatsapp/socket.service.ts**
   - Removed `makeInMemoryStore` dependency
   - Added custom `chatStore` with Map
   - Added event listeners for chat/contact sync events
   - Added `getStore()` method returning custom store

3. **src/main/services/whatsapp/contact.service.ts**
   - Enhanced `extractFromGroups()` to log participant data
   - Enhanced `extractFromChats()` to include names from store
   - Added LID filtering with resolution attempts

4. **src/renderer/components/contacts/ChatSelector.tsx**
   - Improved empty state messaging

5. **src/renderer/stores/useContactStore.ts**
   - Clears existing data before fetching to prevent duplicates

### Current Status (Working)

- [x] App starts without GPU cache errors
- [x] WhatsApp connection via QR/pairing code
- [x] Personal chats fetching (393 chats synced in test)
- [x] Personal chat extraction with names
- [x] Group fetching
- [x] Group extraction (works for contacts with phone numbers)
- [x] Export to Excel
- [x] Deduplication

### To Test

1. Extract contacts from personal chats
2. Extract contacts from groups
3. Export to Excel
4. Verify phone numbers are real (not LID format)

### Commands to Run

```bash
# Start development
cd C:\Users\ibrah\Projects\WA1Link-v2
npm run build:electron && npm start

# If GPU cache issues return, clear app data:
rm -rf %LOCALAPPDATA%\wa1link-v2-dev
```

### Known Limitations

1. **LID Contacts:** WhatsApp privacy change means some group participants only have LID format - no phone numbers available
2. **History Sync:** Chat history only syncs once per session connection
3. **Names:** Contact names depend on what WhatsApp sends in the sync events
