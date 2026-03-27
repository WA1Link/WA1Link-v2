import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index';
import { ExtractedContact, ContactSourceType } from '../../../shared/types';

interface ContactRow {
  id: string;
  phone_number: string;
  name: string | null;
  source_type: ContactSourceType;
  source_name: string | null;
  extracted_at: string;
}

function rowToContact(row: ContactRow): ExtractedContact {
  return {
    id: row.id,
    phoneNumber: row.phone_number,
    name: row.name ?? '',
    sourceType: row.source_type,
    sourceName: row.source_name ?? '',
    extractedAt: row.extracted_at,
  };
}

export class ContactRepository {
  saveContact(contact: Omit<ExtractedContact, 'id' | 'extractedAt'>): ExtractedContact {
    const db = getDatabase();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO extracted_contacts (id, phone_number, name, source_type, source_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, contact.phoneNumber, contact.name, contact.sourceType, contact.sourceName);

    return this.getById(id)!;
  }

  saveContacts(contacts: Omit<ExtractedContact, 'id' | 'extractedAt'>[]): ExtractedContact[] {
    const db = getDatabase();
    const insertStmt = db.prepare(`
      INSERT INTO extracted_contacts (id, phone_number, name, source_type, source_name)
      VALUES (?, ?, ?, ?, ?)
    `);

    const savedContacts: ExtractedContact[] = [];

    const insertMany = db.transaction((contactList: typeof contacts) => {
      for (const contact of contactList) {
        const id = uuidv4();
        insertStmt.run(id, contact.phoneNumber, contact.name, contact.sourceType, contact.sourceName);
        savedContacts.push({
          id,
          phoneNumber: contact.phoneNumber,
          name: contact.name,
          sourceType: contact.sourceType,
          sourceName: contact.sourceName,
          extractedAt: new Date().toISOString(),
        });
      }
    });

    insertMany(contacts);
    return savedContacts;
  }

  getById(id: string): ExtractedContact | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM extracted_contacts WHERE id = ?').get(id) as ContactRow | undefined;
    return row ? rowToContact(row) : null;
  }

  getAll(): ExtractedContact[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM extracted_contacts ORDER BY extracted_at DESC').all() as ContactRow[];
    return rows.map(rowToContact);
  }

  getBySourceType(sourceType: ContactSourceType): ExtractedContact[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM extracted_contacts WHERE source_type = ? ORDER BY extracted_at DESC'
    ).all(sourceType) as ContactRow[];
    return rows.map(rowToContact);
  }

  getByPhoneNumber(phoneNumber: string): ExtractedContact | null {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT * FROM extracted_contacts WHERE phone_number = ?'
    ).get(phoneNumber) as ContactRow | undefined;
    return row ? rowToContact(row) : null;
  }

  deleteById(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM extracted_contacts WHERE id = ?').run(id);
    return result.changes > 0;
  }

  deleteAll(): number {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM extracted_contacts').run();
    return result.changes;
  }

  count(): number {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM extracted_contacts').get() as { count: number };
    return result.count;
  }

  deduplicateByPhone(): number {
    const db = getDatabase();
    // Keep only the first occurrence (by extracted_at) of each phone number
    const result = db.prepare(`
      DELETE FROM extracted_contacts
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM extracted_contacts
        GROUP BY phone_number
      )
    `).run();
    return result.changes;
  }
}

export const contactRepository = new ContactRepository();
