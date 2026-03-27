import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerFilter,
  CustomerStatus,
  CRMDashboardStats,
  DEFAULT_CUSTOMER_STATUS,
  CUSTOMER_STATUSES,
} from '../../../shared/types';
import { cleanPhoneNumber, normalizePhone } from '../../../shared/validation/phone.validation';

interface CustomerRow {
  id: string;
  full_name: string;
  phone_number: string;
  status: string;
  notes: string | null;
  total_paid: number;
  is_active: number;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

    // Check for duplicate phone
    const existing = db.prepare('SELECT 1 FROM customers WHERE phone_number = ?').get(phone);
    if (existing) {
      throw new Error('Bu telefon nömrəsi artıq mövcuddur.');
    }

    db.prepare(`
      INSERT INTO customers (id, full_name, phone_number, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, input.fullName, phone, status, input.notes ?? null);

    return this.getById(id)!;
  }

  getById(id: string): Customer | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as CustomerRow | undefined;
    return row ? rowToCustomer(row) : null;
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

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`SELECT * FROM customers ${where} ORDER BY created_at DESC`).all(...values) as CustomerRow[];
    return rows.map(rowToCustomer);
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

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(input.id);

    db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
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
}

export const customerRepository = new CustomerRepository();
