import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index';
import { Payment, CreatePaymentInput, UpdatePaymentInput, PaymentFilter, PaymentMethod } from '../../../shared/types';
import { customerRepository } from './customer.repository';

interface PaymentRow {
  id: string;
  customer_id: string;
  product_id: string;
  product_price: number;
  discount: number;
  final_amount: number;
  payment_method: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
  product_name?: string;
}

function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    customerId: row.customer_id,
    productId: row.product_id,
    productPrice: row.product_price,
    discount: row.discount,
    finalAmount: row.final_amount,
    paymentMethod: row.payment_method as PaymentMethod,
    paymentDate: row.payment_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    productName: row.product_name,
  };
}

const JOIN_QUERY = `
  SELECT p.*,
    c.full_name as customer_name,
    c.phone_number as customer_phone,
    pr.name as product_name
  FROM payments p
  LEFT JOIN customers c ON p.customer_id = c.id
  LEFT JOIN products pr ON p.product_id = pr.id
`;

export class PaymentRepository {
  create(input: CreatePaymentInput): Payment {
    const db = getDatabase();
    const id = uuidv4();
    const discount = input.discount ?? 0;
    const paymentMethod = input.paymentMethod ?? 'cash';

    // Validate discount
    if (discount < 0) {
      throw new Error('Endirim mənfi ola bilməz.');
    }
    if (discount > input.productPrice) {
      throw new Error('Endirim məhsulun qiymətindən çox ola bilməz.');
    }

    const finalAmount = input.productPrice - discount;

    db.prepare(`
      INSERT INTO payments (id, customer_id, product_id, product_price, discount, final_amount, payment_method, payment_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.customerId, input.productId, input.productPrice, discount, finalAmount, paymentMethod, input.paymentDate);

    // Recalculate customer total_paid
    customerRepository.recalculateTotalPaid(input.customerId);

    return this.getById(id)!;
  }

  getById(id: string): Payment | null {
    const db = getDatabase();
    const row = db.prepare(`${JOIN_QUERY} WHERE p.id = ?`).get(id) as PaymentRow | undefined;
    return row ? rowToPayment(row) : null;
  }

  getAll(filter?: PaymentFilter): Payment[] {
    const db = getDatabase();
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter?.customerId) {
      conditions.push('p.customer_id = ?');
      values.push(filter.customerId);
    }

    if (filter?.productId) {
      conditions.push('p.product_id = ?');
      values.push(filter.productId);
    }

    if (filter?.dateFrom) {
      conditions.push('p.payment_date >= ?');
      values.push(filter.dateFrom);
    }

    if (filter?.dateTo) {
      conditions.push('p.payment_date <= ?');
      values.push(filter.dateTo);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`${JOIN_QUERY} ${where} ORDER BY p.payment_date DESC, p.created_at DESC`).all(...values) as PaymentRow[];
    return rows.map(rowToPayment);
  }

  getByCustomer(customerId: string): Payment[] {
    const db = getDatabase();
    const rows = db.prepare(`${JOIN_QUERY} WHERE p.customer_id = ? ORDER BY p.payment_date DESC`).all(customerId) as PaymentRow[];
    return rows.map(rowToPayment);
  }

  update(input: UpdatePaymentInput): Payment {
    const db = getDatabase();
    const existing = this.getById(input.id);
    if (!existing) {
      throw new Error('Ödəniş tapılmadı.');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    let productPrice = existing.productPrice;
    let discount = existing.discount;

    if (input.productPrice !== undefined) {
      productPrice = input.productPrice;
      updates.push('product_price = ?');
      values.push(productPrice);
    }

    if (input.discount !== undefined) {
      discount = input.discount;
      updates.push('discount = ?');
      values.push(discount);
    }

    // Validate discount
    if (discount < 0) {
      throw new Error('Endirim mənfi ola bilməz.');
    }
    if (discount > productPrice) {
      throw new Error('Endirim məhsulun qiymətindən çox ola bilməz.');
    }

    // Recalculate final_amount if price or discount changed
    if (input.productPrice !== undefined || input.discount !== undefined) {
      const finalAmount = productPrice - discount;
      updates.push('final_amount = ?');
      values.push(finalAmount);
    }

    if (input.productId !== undefined) {
      updates.push('product_id = ?');
      values.push(input.productId);
    }

    if (input.paymentMethod !== undefined) {
      updates.push('payment_method = ?');
      values.push(input.paymentMethod);
    }

    if (input.paymentDate !== undefined) {
      updates.push('payment_date = ?');
      values.push(input.paymentDate);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(input.id);

    db.prepare(`UPDATE payments SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Recalculate customer total_paid
    customerRepository.recalculateTotalPaid(existing.customerId);

    return this.getById(input.id)!;
  }

  delete(id: string): void {
    const db = getDatabase();
    const existing = this.getById(id);
    if (!existing) {
      throw new Error('Ödəniş tapılmadı.');
    }

    db.prepare('DELETE FROM payments WHERE id = ?').run(id);

    // Recalculate customer total_paid
    customerRepository.recalculateTotalPaid(existing.customerId);
  }

  count(): number {
    const db = getDatabase();
    return (db.prepare('SELECT COUNT(*) as count FROM payments').get() as { count: number }).count;
  }
}

export const paymentRepository = new PaymentRepository();
