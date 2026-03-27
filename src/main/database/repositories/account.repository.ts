import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index';
import { Account, CreateAccountInput, UpdateAccountInput } from '../../../shared/types';

interface AccountRow {
  id: string;
  name: string;
  phone_number: string | null;
  country_code: string;
  is_verified: number;
  created_at: string;
}

function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    phoneNumber: row.phone_number,
    countryCode: row.country_code,
    isVerified: row.is_verified === 1,
    createdAt: row.created_at,
  };
}

export class AccountRepository {
  create(input: CreateAccountInput): Account {
    const db = getDatabase();
    const id = uuidv4();
    const countryCode = input.countryCode ?? '994';

    db.prepare(`
      INSERT INTO accounts (id, name, country_code)
      VALUES (?, ?, ?)
    `).run(id, input.name, countryCode);

    return this.getById(id)!;
  }

  getById(id: string): Account | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow | undefined;
    return row ? rowToAccount(row) : null;
  }

  getAll(): Account[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all() as AccountRow[];
    return rows.map(rowToAccount);
  }

  update(input: UpdateAccountInput): Account | null {
    const db = getDatabase();
    const existing = this.getById(input.id);

    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }

    if (input.phoneNumber !== undefined) {
      updates.push('phone_number = ?');
      values.push(input.phoneNumber);
    }

    if (input.countryCode !== undefined) {
      updates.push('country_code = ?');
      values.push(input.countryCode);
    }

    if (input.isVerified !== undefined) {
      updates.push('is_verified = ?');
      values.push(input.isVerified ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(input.id);

    db.prepare(`
      UPDATE accounts
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    return this.getById(input.id);
  }

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getByPhoneNumber(phoneNumber: string): Account | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM accounts WHERE phone_number = ?').get(phoneNumber) as AccountRow | undefined;
    return row ? rowToAccount(row) : null;
  }

  count(): number {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };
    return result.count;
  }
}

export const accountRepository = new AccountRepository();
