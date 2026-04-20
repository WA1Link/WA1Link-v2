import Database from 'better-sqlite3';

export function runTargetHistoryMigration(db: Database.Database): void {
  const migrationName = '007_target_history';
  const exists = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(migrationName);

  if (exists) {
    return;
  }

  console.log('Running migration:', migrationName);

  db.exec(`
    ALTER TABLE job_targets ADD COLUMN sent_at DATETIME;
    ALTER TABLE job_targets ADD COLUMN error_message TEXT;
    ALTER TABLE job_targets ADD COLUMN template_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_job_targets_sent_at
      ON job_targets(sent_at DESC);
  `);

  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
  console.log('Migration completed:', migrationName);
}
