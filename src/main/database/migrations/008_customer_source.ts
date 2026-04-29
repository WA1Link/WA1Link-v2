import Database from 'better-sqlite3';

export function runCustomerSourceMigration(db: Database.Database): void {
  const migrationName = '008_customer_source';
  const exists = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(migrationName);

  if (exists) {
    return;
  }

  console.log('Running migration:', migrationName);

  const cols = db.prepare(`PRAGMA table_info(customers)`).all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));

  if (!colNames.has('source_type')) {
    db.exec(`ALTER TABLE customers ADD COLUMN source_type TEXT DEFAULT 'manual'`);
  }
  if (!colNames.has('source_name')) {
    db.exec(`ALTER TABLE customers ADD COLUMN source_name TEXT`);
  }

  db.exec(`
    UPDATE customers SET source_type = 'manual' WHERE source_type IS NULL;
    CREATE INDEX IF NOT EXISTS idx_customers_source_type ON customers(source_type);
    CREATE INDEX IF NOT EXISTS idx_customers_source_name ON customers(source_name);
  `);

  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
  console.log('Migration completed:', migrationName);
}
