import Database from 'better-sqlite3';

export function runWhatsAppChatsMigration(db: Database.Database): void {
  const migrationName = '005_whatsapp_chats';
  const exists = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(migrationName);

  if (exists) {
    return;
  }

  console.log('Running migration:', migrationName);

  db.exec(`
    -- WhatsApp chats persisted per account
    CREATE TABLE IF NOT EXISTS whatsapp_chats (
      jid TEXT NOT NULL,
      account_id TEXT NOT NULL,
      name TEXT,
      notify TEXT,
      last_message TEXT,
      last_message_time INTEGER,
      unread_count INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (jid, account_id)
    );

    CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_account
      ON whatsapp_chats(account_id);
  `);

  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
  console.log('Migration completed:', migrationName);
}
