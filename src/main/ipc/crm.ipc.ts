import { ipcMain, BrowserWindow, dialog } from 'electron';
import { IPC_CHANNELS } from './channels';
import { customerRepository } from '../database/repositories/customer.repository';
import { productRepository } from '../database/repositories/product.repository';
import { paymentRepository } from '../database/repositories/payment.repository';
import { tagRepository } from '../database/repositories/tag.repository';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerFilter,
  Customer,
  CustomerSource,
  CustomerSourceType,
  CRMDashboardStats,
  CreateProductInput,
  UpdateProductInput,
  Product,
  CreatePaymentInput,
  UpdatePaymentInput,
  PaymentFilter,
  Payment,
  Tag,
  CreateTagInput,
  UpdateTagInput,
} from '../../shared/types';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

export function registerCRMIPC(mainWindow: BrowserWindow): void {
  // ============ CUSTOMER ============

  ipcMain.handle(IPC_CHANNELS.CUSTOMER.CREATE, async (_, input: CreateCustomerInput): Promise<Customer> => {
    return customerRepository.create(input);
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMER.GET_ALL, async (_, filter?: CustomerFilter): Promise<Customer[]> => {
    return customerRepository.getAll(filter);
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMER.GET_BY_ID, async (_, id: string): Promise<Customer | null> => {
    return customerRepository.getById(id);
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMER.UPDATE, async (_, input: UpdateCustomerInput): Promise<Customer> => {
    return customerRepository.update(input);
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMER.DELETE, async (_, id: string): Promise<void> => {
    customerRepository.delete(id);
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMER.SEARCH, async (_, filter: CustomerFilter): Promise<Customer[]> => {
    return customerRepository.getAll(filter);
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMER.GET_STATS, async (): Promise<CRMDashboardStats> => {
    return customerRepository.getStats();
  });

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMER.ENSURE_BULK,
    async (
      _,
      contacts: Array<{
        phone: string;
        name: string;
        sourceType?: CustomerSourceType;
        sourceName?: string | null;
      }>
    ): Promise<{ created: number; skipped: number; failed: number }> => {
      return customerRepository.ensureContactsBulk(contacts);
    }
  );

  ipcMain.handle(IPC_CHANNELS.CUSTOMER.GET_SOURCES, async (): Promise<CustomerSource[]> => {
    return customerRepository.getDistinctSources();
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMER.EXPORT, async (_, filter?: CustomerFilter): Promise<string> => {
    const customers = customerRepository.getAll(filter);

    const data = customers.map((c) => ({
      'Ad Soyad': c.fullName,
      'Telefon': c.phoneNumber,
      'Status': c.status,
      'Ümumi ödəniş': c.totalPaid,
      'Qeydlər': c.notes ?? '',
      'Aktiv': c.isActive ? 'Bəli' : 'Xeyr',
      'Yaradılma tarixi': c.createdAt,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Müştərilər');

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Müştəriləri ixrac et',
      defaultPath: 'customers.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });

    if (result.canceled || !result.filePath) {
      throw new Error('İxrac ləğv edildi.');
    }

    XLSX.writeFile(wb, result.filePath);
    return result.filePath;
  });

  // ============ TAG ============

  ipcMain.handle(IPC_CHANNELS.TAG.GET_ALL, async (): Promise<Tag[]> => {
    return tagRepository.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.TAG.CREATE, async (_, input: CreateTagInput): Promise<Tag> => {
    return tagRepository.create(input);
  });

  ipcMain.handle(IPC_CHANNELS.TAG.UPDATE, async (_, input: UpdateTagInput): Promise<Tag> => {
    return tagRepository.update(input);
  });

  ipcMain.handle(IPC_CHANNELS.TAG.DELETE, async (_, id: string): Promise<void> => {
    tagRepository.delete(id);
  });

  ipcMain.handle(
    IPC_CHANNELS.TAG.SET_FOR_CUSTOMER,
    async (_, customerId: string, tagIds: string[]): Promise<void> => {
      tagRepository.setCustomerTags(customerId, tagIds);
    }
  );

  // ============ PRODUCT ============

  ipcMain.handle(IPC_CHANNELS.PRODUCT.CREATE, async (_, input: CreateProductInput): Promise<Product> => {
    return productRepository.create(input);
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCT.GET_ALL, async (): Promise<Product[]> => {
    return productRepository.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCT.UPDATE, async (_, input: UpdateProductInput): Promise<Product> => {
    return productRepository.update(input);
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCT.DELETE, async (_, id: string): Promise<void> => {
    productRepository.delete(id);
  });

  // ============ PAYMENT ============

  ipcMain.handle(IPC_CHANNELS.PAYMENT.CREATE, async (_, input: CreatePaymentInput): Promise<Payment> => {
    return paymentRepository.create(input);
  });

  ipcMain.handle(IPC_CHANNELS.PAYMENT.GET_ALL, async (_, filter?: PaymentFilter): Promise<Payment[]> => {
    return paymentRepository.getAll(filter);
  });

  ipcMain.handle(IPC_CHANNELS.PAYMENT.GET_BY_CUSTOMER, async (_, customerId: string): Promise<Payment[]> => {
    return paymentRepository.getByCustomer(customerId);
  });

  ipcMain.handle(IPC_CHANNELS.PAYMENT.UPDATE, async (_, input: UpdatePaymentInput): Promise<Payment> => {
    return paymentRepository.update(input);
  });

  ipcMain.handle(IPC_CHANNELS.PAYMENT.DELETE, async (_, id: string): Promise<void> => {
    paymentRepository.delete(id);
  });

  ipcMain.handle(IPC_CHANNELS.PAYMENT.EXPORT, async (_, filter?: PaymentFilter): Promise<string> => {
    const payments = paymentRepository.getAll(filter);

    const data = payments.map((p) => ({
      'Müştəri': p.customerName ?? '',
      'Məhsul': p.productName ?? '',
      'Məhsul qiyməti': p.productPrice,
      'Endirim': p.discount,
      'Yekun məbləğ': p.finalAmount,
      'Ödəniş üsulu': p.paymentMethod,
      'Tarix': p.paymentDate,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Ödənişlər');

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Ödənişləri ixrac et',
      defaultPath: 'payments.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });

    if (result.canceled || !result.filePath) {
      throw new Error('İxrac ləğv edildi.');
    }

    XLSX.writeFile(wb, result.filePath);
    return result.filePath;
  });
}
