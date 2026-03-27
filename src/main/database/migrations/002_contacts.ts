import Database from 'better-sqlite3';

export function runContactsMigration(db: Database.Database): void {
  const migrationName = '002_contacts';
  const exists = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(migrationName);

  if (exists) {
    return;
  }

  console.log('Running migration:', migrationName);

  db.exec(`
    -- Extracted contacts table
    CREATE TABLE IF NOT EXISTS extracted_contacts (
      id TEXT PRIMARY KEY,
      phone_number TEXT NOT NULL,
      name TEXT,
      source_type TEXT CHECK(source_type IN ('group', 'chat')) NOT NULL,
      source_name TEXT,
      extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for contacts
    CREATE INDEX IF NOT EXISTS idx_extracted_contacts_phone
      ON extracted_contacts(phone_number);
    CREATE INDEX IF NOT EXISTS idx_extracted_contacts_source_type
      ON extracted_contacts(source_type);
  `);

  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
  console.log('Migration completed:', migrationName);
}
