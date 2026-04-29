import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerFilter,
  CustomerStatus,
  CustomerSource,
  CustomerSourceType,
  CRMDashboardStats,
  DEFAULT_CUSTOMER_STATUS,
  CUSTOMER_STATUSES,
} from '../../../shared/types';
import { cleanPhoneNumber, normalizePhone } from '../../../shared/validation/phone.validation';
import { tagRepository } from './tag.repository';

interface CustomerRow {
  id: string;
  full_name: string;
  phone_number: string;
  status: string;
  notes: string | null;
  total_paid: number;
  is_active: number;
  source_type: string | null;
  source_name: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    fullName: row.full_name,
    phoneNumber: row.phone_number,
    status: row.status as CustomerStatus,
    notes: row.notes,
    totalPaid: row.total_paid,
    isActive: row.is_active === 1,
    sourceType: (row.source_type as CustomerSourceType) ?? 'manual',
    sourceName: row.source_name,
    tags: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Hydrate customers' tags in batch using a single grouped query. */
function hydrateTags(customers: Customer[]): Customer[] {
  if (customers.length === 0) return customers;
  const tagsByCustomer = tagRepository.getTagsForCustomers(customers.map((c) => c.id));
  for (const c of customers) {
    c.tags = tagsByCustomer.get(c.id) ?? [];
  }
  return customers;
}

function normalizePhoneNumber(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  const normalized = normalizePhone(cleaned, '994');
  return normalized ? normalized.full : cleaned;
}

export class CustomerRepository {
  create(input: CreateCustomerInput): Customer {
    const db = getDatabase();
    const id = uuidv4();
    const phone = normalizePhoneNumber(input.phoneNumber);
    const status = input.status ?? DEFAULT_CUSTOMER_STATUS;
    const sourceType = input.sourceType ?? 'manual';
    const sourceName = input.sourceName ?? null;

    // Check for duplicate phone
    const existing = db.prepare('SELECT 1 FROM customers WHERE phone_number = ?').get(phone);
    if (existing) {
      throw new Error('Bu telefon nömrəsi artıq mövcuddur.');
    }

    db.prepare(`
      INSERT INTO customers (id, full_name, phone_number, status, notes, source_type, source_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.fullName, phone, status, input.notes ?? null, sourceType, sourceName);

    if (input.tagIds && input.tagIds.length > 0) {
      tagRepository.setCustomerTags(id, input.tagIds);
    }

    return this.getById(id)!;
  }

  getById(id: string): Customer | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as CustomerRow | undefined;
    if (!row) return null;
    const customer = rowToCustomer(row);
    hydrateTags([customer]);
    return customer;
  }

  getAll(filter?: CustomerFilter): Customer[] {
    const db = getDatabase();
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter?.isActive !== undefined) {
      conditions.push('is_active = ?');
      values.push(filter.isActive ? 1 : 0);
    }

    if (filter?.status) {
      conditions.push('status = ?');
      values.push(filter.status);
    }

    if (filter?.search) {
      conditions.push('(full_name LIKE ? OR phone_number LIKE ?)');
      const searchTerm = `%${filter.search}%`;
      values.push(searchTerm, searchTerm);
    }

    if (filter?.sourceType) {
      conditions.push('source_type = ?');
      values.push(filter.sourceType);

      // Only narrow by sourceName when filtering a 'group' source — for other
      // source types, sourceName isn't meaningful (no per-name dropdown).
      if (filter.sourceType === 'group' && filter.sourceName !== undefined && filter.sourceName !== null) {
        conditions.push('source_name = ?');
        values.push(filter.sourceName);
      }
    }

    const tagIds = filter?.tagIds?.filter(Boolean) ?? [];
    let from = 'customers';
    let groupBy = '';
    if (tagIds.length > 0) {
      const placeholders = tagIds.map(() => '?').join(',');
      from = `customers JOIN customer_tags ct ON ct.customer_id = customers.id`;
      conditions.push(`ct.tag_id IN (${placeholders})`);
      values.push(...tagIds);
      // OR semantics: a customer matching multiple selected tags should still
      // appear once. GROUP BY id collapses the join duplicates.
      groupBy = 'GROUP BY customers.id';
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT customers.* FROM ${from} ${where} ${groupBy} ORDER BY created_at DESC`)
      .all(...values) as CustomerRow[];
    return hydrateTags(rows.map(rowToCustomer));
  }

  update(input: UpdateCustomerInput): Customer {
    const db = getDatabase();
    const existing = this.getById(input.id);
    if (!existing) {
      throw new Error('Müştəri tapılmadı.');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.fullName !== undefined) {
      updates.push('full_name = ?');
      values.push(input.fullName);
    }

    if (input.phoneNumber !== undefined) {
      const phone = normalizePhoneNumber(input.phoneNumber);
      // Check uniqueness if phone changed
      if (phone !== existing.phoneNumber) {
        const dup = db.prepare('SELECT 1 FROM customers WHERE phone_number = ? AND id != ?').get(phone, input.id);
        if (dup) {
          throw new Error('Bu telefon nömrəsi artıq mövcuddur.');
        }
      }
      updates.push('phone_number = ?');
      values.push(phone);
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }

    if (input.notes !== undefined) {
      updates.push('notes = ?');
      values.push(input.notes);
    }

    if (input.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(input.isActive ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(input.id);
      db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    if (input.tagIds !== undefined) {
      tagRepository.setCustomerTags(input.id, input.tagIds);
    }

    return this.getById(input.id)!;
  }

  delete(id: string): void {
    const db = getDatabase();

    // Check for existing payments
    const hasPayments = db.prepare('SELECT 1 FROM payments WHERE customer_id = ?').get(id);
    if (hasPayments) {
      throw new Error('Bu müştəri silinə bilməz, çünki mövcud ödənişləri var.');
    }

    const result = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error('Müştəri tapılmadı.');
    }
  }

  recalculateTotalPaid(customerId: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE customers
      SET total_paid = COALESCE((SELECT SUM(final_amount) FROM payments WHERE customer_id = ?), 0),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(customerId, customerId);
  }

  getStats(): CRMDashboardStats {
    const db = getDatabase();

    const totalCustomers = (db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }).count;
    const activeCustomers = (db.prepare('SELECT COUNT(*) as count FROM customers WHERE is_active = 1').get() as { count: number }).count;
    const totalRevenue = (db.prepare('SELECT COALESCE(SUM(final_amount), 0) as total FROM payments').get() as { total: number }).total;
    const totalPayments = (db.prepare('SELECT COUNT(*) as count FROM payments').get() as { count: number }).count;

    const statusCounts = {} as Record<CustomerStatus, number>;
    for (const status of CUSTOMER_STATUSES) {
      const result = db.prepare('SELECT COUNT(*) as count FROM customers WHERE status = ? AND is_active = 1').get(status) as { count: number };
      statusCounts[status] = result.count;
    }

    return { totalCustomers, activeCustomers, totalRevenue, totalPayments, statusCounts };
  }

  count(): number {
    const db = getDatabase();
    return (db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }).count;
  }

  /**
   * Find a customer by normalized phone number.
   * Returns null if not found.
   */
  findByPhone(phone: string): Customer | null {
    const db = getDatabase();
    const normalized = normalizePhoneNumber(phone);
    const row = db.prepare('SELECT * FROM customers WHERE phone_number = ?').get(normalized) as CustomerRow | undefined;
    return row ? rowToCustomer(row) : null;
  }

  /**
   * Ensure a contact exists in CRM. If the phone number doesn't exist,
   * create a new customer with status "Potensial müştəri".
   * If it already exists, skip silently.
   * Returns { created: boolean } to track stats.
   */
  ensureContact(
    phone: string,
    name: string,
    sourceType: CustomerSourceType = 'imported',
    sourceName: string | null = null
  ): { created: boolean } {
    const db = getDatabase();
    const normalized = normalizePhoneNumber(phone);

    const existing = db.prepare('SELECT 1 FROM customers WHERE phone_number = ?').get(normalized);
    if (existing) {
      return { created: false };
    }

    const id = uuidv4();
    db.prepare(`
      INSERT OR IGNORE INTO customers (id, full_name, phone_number, status, notes, source_type, source_name)
      VALUES (?, ?, ?, ?, NULL, ?, ?)
    `).run(id, name || normalized, normalized, DEFAULT_CUSTOMER_STATUS, sourceType, sourceName);

    return { created: true };
  }

  /**
   * Bulk ensure contacts exist in CRM. Runs as a single transaction.
   * Returns counts of created (new), skipped (already existed), and failed (invalid input).
   */
  ensureContactsBulk(
    contacts: Array<{
      phone: string;
      name: string;
      sourceType?: CustomerSourceType;
      sourceName?: string | null;
    }>
  ): { created: number; skipped: number; failed: number } {
    const db = getDatabase();
    let created = 0;
    let skipped = 0;
    let failed = 0;

    const checkStmt = db.prepare('SELECT 1 FROM customers WHERE phone_number = ?');
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO customers (id, full_name, phone_number, status, notes, source_type, source_name)
      VALUES (?, ?, ?, ?, NULL, ?, ?)
    `);
    const seen = new Set<string>();

    const tx = db.transaction((items: typeof contacts) => {
      for (const item of items) {
        const normalized = normalizePhoneNumber(item.phone);
        if (!normalized) {
          failed++;
          continue;
        }
        if (seen.has(normalized)) {
          skipped++;
          continue;
        }
        seen.add(normalized);

        if (checkStmt.get(normalized)) {
          skipped++;
          continue;
        }

        const result = insertStmt.run(
          uuidv4(),
          item.name || normalized,
          normalized,
          DEFAULT_CUSTOMER_STATUS,
          item.sourceType ?? 'imported',
          item.sourceName ?? null
        );
        if (result.changes > 0) {
          created++;
        } else {
          skipped++;
        }
      }
    });

    tx(contacts);
    return { created, skipped, failed };
  }

  /**
   * Distinct (sourceType, sourceName) tuples present in the customers table.
   * For 'group' source we surface each group name separately; for other source
   * types we collapse to a single bucket per type (sourceName is null).
   */
  getDistinctSources(): CustomerSource[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        COALESCE(source_type, 'manual') as source_type,
        CASE WHEN source_type = 'group' THEN source_name ELSE NULL END as source_name,
        COUNT(*) as count
      FROM customers
      GROUP BY source_type, CASE WHEN source_type = 'group' THEN source_name ELSE NULL END
      ORDER BY source_type, source_name
    `).all() as Array<{ source_type: string; source_name: string | null; count: number }>;

    return rows.map((r) => ({
      sourceType: r.source_type as CustomerSourceType,
      sourceName: r.source_name,
      count: r.count,
    }));
  }
}

export const customerRepository = new CustomerRepository();
