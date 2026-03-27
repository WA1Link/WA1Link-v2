import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index';
import { Product, CreateProductInput, UpdateProductInput } from '../../../shared/types';

interface ProductRow {
  id: string;
  name: string;
  price: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProductRepository {
  create(input: CreateProductInput): Product {
    const db = getDatabase();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO products (id, name, price)
      VALUES (?, ?, ?)
    `).run(id, input.name, input.price);

    return this.getById(id)!;
  }

  getById(id: string): Product | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
    return row ? rowToProduct(row) : null;
  }

  getAll(): Product[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all() as ProductRow[];
    return rows.map(rowToProduct);
  }

  update(input: UpdateProductInput): Product {
    const db = getDatabase();
    const existing = this.getById(input.id);
    if (!existing) {
      throw new Error('Məhsul tapılmadı.');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }

    if (input.price !== undefined) {
      updates.push('price = ?');
      values.push(input.price);
    }

    if (input.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(input.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(input.id);

    db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(input.id)!;
  }

  delete(id: string): void {
    const db = getDatabase();

    // Check for existing payments
    const hasPayments = db.prepare('SELECT 1 FROM payments WHERE product_id = ?').get(id);
    if (hasPayments) {
      throw new Error('Bu məhsul silinə bilməz, çünki mövcud ödənişlərdə istifadə olunur.');
    }

    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error('Məhsul tapılmadı.');
    }
  }

  count(): number {
    const db = getDatabase();
    return (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
  }
}

export const productRepository = new ProductRepository();
