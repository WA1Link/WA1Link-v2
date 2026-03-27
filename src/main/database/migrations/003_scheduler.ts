import Database from 'better-sqlite3';

export function runSchedulerMigration(db: Database.Database): void {
  const migrationName = '003_scheduler';
  const exists = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(migrationName);

  if (exists) {
    return;
  }

  console.log('Running migration:', migrationName);

  db.exec(`
    -- Scheduled jobs table
    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      account_id TEXT NOT NULL,
      template_ids TEXT NOT NULL,  -- JSON array
      scheduled_at DATETIME NOT NULL,
      status TEXT CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
      delay_config TEXT NOT NULL,  -- JSON object
      total_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      started_at DATETIME,
      completed_at DATETIME,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    -- Job targets table
    CREATE TABLE IF NOT EXISTS job_targets (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      name TEXT,
      custom_fields TEXT,  -- JSON object
      status TEXT CHECK(status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
      FOREIGN KEY (job_id) REFERENCES scheduled_jobs(id) ON DELETE CASCADE
    );

    -- Create indexes for scheduler
    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status
      ON scheduled_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_scheduled_at
      ON scheduled_jobs(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_job_targets_job_id
      ON job_targets(job_id);
    CREATE INDEX IF NOT EXISTS idx_job_targets_status
      ON job_targets(status);
  `);

  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
  console.log('Migration completed:', migrationName);
}
