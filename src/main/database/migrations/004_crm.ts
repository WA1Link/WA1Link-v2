import Database from 'better-sqlite3';

export function runCRMMigration(db: Database.Database): void {
  const migrationName = '004_crm';
  const exists = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(migrationName);

  if (exists) {
    return;
  }

  console.log('Running migration:', migrationName);

  db.exec(`
    -- Customers (Lead Management)
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'Potensial müştəri',
      notes TEXT,
      total_paid REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Payments
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      payment_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
    CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
    CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
    CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_product_id ON payments(product_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
  `);

  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
  console.log('Migration completed:', migrationName);
}
