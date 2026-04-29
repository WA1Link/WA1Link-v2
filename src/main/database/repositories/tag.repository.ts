import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index';
import {
  Tag,
  CreateTagInput,
  UpdateTagInput,
  DEFAULT_TAG_COLORS,
} from '../../../shared/types';

interface TagRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

function rowToTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export class TagRepository {
  getAll(): Tag[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM tags ORDER BY sort_order ASC, name ASC')
      .all() as TagRow[];
    return rows.map(rowToTag);
  }

  getById(id: string): Tag | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as TagRow | undefined;
    return row ? rowToTag(row) : null;
  }

  create(input: CreateTagInput): Tag {
    const db = getDatabase();
    const name = input.name.trim();
    if (!name) {
      throw new Error('Etiket adı boş ola bilməz.');
    }

    const dup = db.prepare('SELECT 1 FROM tags WHERE name = ?').get(name);
    if (dup) {
      throw new Error('Bu adda etiket artıq mövcuddur.');
    }

    const id = uuidv4();
    const color = input.color ?? DEFAULT_TAG_COLORS[0];
    const sortOrder = input.sortOrder ?? 0;

    db.prepare('INSERT INTO tags (id, name, color, sort_order) VALUES (?, ?, ?, ?)').run(
      id,
      name,
      color,
      sortOrder
    );
    return this.getById(id)!;
  }

  update(input: UpdateTagInput): Tag {
    const db = getDatabase();
    const existing = this.getById(input.id);
    if (!existing) {
      throw new Error('Etiket tapılmadı.');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      const newName = input.name.trim();
      if (!newName) {
        throw new Error('Etiket adı boş ola bilməz.');
      }
      if (newName !== existing.name) {
        const dup = db.prepare('SELECT 1 FROM tags WHERE name = ? AND id != ?').get(newName, input.id);
        if (dup) {
          throw new Error('Bu adda etiket artıq mövcuddur.');
        }
      }
      updates.push('name = ?');
      values.push(newName);
    }
    if (input.color !== undefined) {
      updates.push('color = ?');
      values.push(input.color);
    }
    if (input.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(input.sortOrder);
    }

    if (updates.length === 0) return existing;

    values.push(input.id);
    db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(input.id)!;
  }

  delete(id: string): void {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error('Etiket tapılmadı.');
    }
    // customer_tags rows cascade via FK ON DELETE CASCADE.
  }

  /** Replace all tags for a customer with the given tagIds. */
  setCustomerTags(customerId: string, tagIds: string[]): void {
    const db = getDatabase();
    const tx = db.transaction((ids: string[]) => {
      db.prepare('DELETE FROM customer_tags WHERE customer_id = ?').run(customerId);
      const insert = db.prepare(
        'INSERT OR IGNORE INTO customer_tags (customer_id, tag_id) VALUES (?, ?)'
      );
      for (const tagId of ids) {
        insert.run(customerId, tagId);
      }
    });
    tx(tagIds);
  }

  /** Returns a Map of customerId -> Tag[], for the supplied customer ids. */
  getTagsForCustomers(customerIds: string[]): Map<string, Tag[]> {
    const result = new Map<string, Tag[]>();
    for (const id of customerIds) result.set(id, []);

    if (customerIds.length === 0) return result;

    const db = getDatabase();
    const placeholders = customerIds.map(() => '?').join(',');
    const rows = db
      .prepare(`
        SELECT ct.customer_id, t.id, t.name, t.color, t.sort_order, t.created_at
        FROM customer_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.customer_id IN (${placeholders})
        ORDER BY t.sort_order ASC, t.name ASC
      `)
      .all(...customerIds) as Array<TagRow & { customer_id: string }>;

    for (const row of rows) {
      const list = result.get(row.customer_id);
      if (list) list.push(rowToTag(row));
    }
    return result;
  }
}

export const tagRepository = new TagRepository();
