import Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  // Create migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationName = '001_initial';
  const exists = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(migrationName);

  if (exists) {
    return;
  }

  console.log('Running migration:', migrationName);

  db.exec(`
    -- Accounts table
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone_number TEXT UNIQUE,
      country_code TEXT DEFAULT '994',
      is_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Message templates table
    CREATE TABLE IF NOT EXISTS message_templates (
      id TEXT PRIMARY KEY,
      name TEXT,
      is_selected INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Template contents table
    CREATE TABLE IF NOT EXISTS template_contents (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      content_type TEXT CHECK(content_type IN ('text', 'image')) NOT NULL,
      content_value TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE CASCADE
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_template_contents_template_id
      ON template_contents(template_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_phone_number
      ON accounts(phone_number);
  `);

  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
  console.log('Migration completed:', migrationName);
}
