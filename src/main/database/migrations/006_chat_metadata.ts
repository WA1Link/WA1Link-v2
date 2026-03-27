import Database from 'better-sqlite3';

export function runChatMetadataMigration(db: Database.Database): void {
  const migrationName = '006_chat_metadata';
  const exists = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(migrationName);

  if (exists) {
    return;
  }

  console.log('Running migration:', migrationName);

  // Add new columns to whatsapp_chats if they don't exist
  const columns = db.pragma('table_info(whatsapp_chats)') as Array<{ name: string }>;
  const columnNames = new Set(columns.map((c) => c.name));

  if (!columnNames.has('last_message')) {
    db.exec('ALTER TABLE whatsapp_chats ADD COLUMN last_message TEXT');
  }
  if (!columnNames.has('last_message_time')) {
    db.exec('ALTER TABLE whatsapp_chats ADD COLUMN last_message_time INTEGER');
  }
  if (!columnNames.has('unread_count')) {
    db.exec('ALTER TABLE whatsapp_chats ADD COLUMN unread_count INTEGER DEFAULT 0');
  }

  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
  console.log('Migration completed:', migrationName);
}
