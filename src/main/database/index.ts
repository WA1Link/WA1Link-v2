import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { runMigrations } from './migrations/001_initial';
import { runContactsMigration } from './migrations/002_contacts';
import { runSchedulerMigration } from './migrations/003_scheduler';
import { runCRMMigration } from './migrations/004_crm';
import { runWhatsAppChatsMigration } from './migrations/005_whatsapp_chats';
import { runChatMetadataMigration } from './migrations/006_chat_metadata';
import { runTargetHistoryMigration } from './migrations/007_target_history';
import { runCustomerSourceMigration } from './migrations/008_customer_source';
import { runCustomerTagsMigration } from './migrations/009_customer_tags';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}

export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'wa1link.db');

  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Run migrations
  runMigrations(db);
  runContactsMigration(db);
  runSchedulerMigration(db);
  runCRMMigration(db);
  runWhatsAppChatsMigration(db);
  runChatMetadataMigration(db);
  runTargetHistoryMigration(db);
  runCustomerSourceMigration(db);
  runCustomerTagsMigration(db);

  console.log('Database initialized at:', dbPath);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export { Database };
