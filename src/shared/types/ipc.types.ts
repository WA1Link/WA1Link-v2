import { Account, AccountConnection, CreateAccountInput } from './account.types';
import {
  BulkSendRequest,
  CRMSyncStats,
  CreateTemplateInput,
  MessageTemplate,
  SendingProgress,
  UpdateTemplateInput,
} from './message.types';
import {
  ExtractedContact,
  ExportOptions,
  ExtractionRequest,
  PersonalChat,
  WhatsAppGroup,
} from './contact.types';
import {
  CreateJobInput,
  JobProgress,
  ScheduledJob,
  MessageHistoryFilter,
  MessageHistoryResult,
} from './schedule.types';
import { LicensePayload, LicenseState } from './license.types';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerFilter,
  CRMDashboardStats,
  Product,
  CreateProductInput,
  UpdateProductInput,
  Payment,
  CreatePaymentInput,
  UpdatePaymentInput,
  PaymentFilter,
} from './crm.types';

// Account IPC
export interface AccountAPI {
  create: (input: CreateAccountInput) => Promise<Account>;
  getAll: () => Promise<Account[]>;
  delete: (id: string) => Promise<void>;
  connect: (id: string, usePairingCode?: boolean, phoneNumber?: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  onStatusChanged: (callback: (connection: AccountConnection) => void) => () => void;
  onQRReceived: (callback: (data: { accountId: string; qrCode: string }) => void) => () => void;
  onPairingCodeReceived: (callback: (data: { accountId: string; code: string }) => void) => () => void;
}

// Message IPC
export interface MessageAPI {
  createTemplate: (input: CreateTemplateInput) => Promise<MessageTemplate>;
  getAllTemplates: () => Promise<MessageTemplate[]>;
  updateTemplate: (input: UpdateTemplateInput) => Promise<MessageTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  sendBulk: (request: BulkSendRequest) => Promise<void>;
  stopSending: () => Promise<void>;
  selectImage: () => Promise<string | null>;
  onProgress: (callback: (progress: SendingProgress) => void) => () => void;
  onComplete: (callback: (result: { sent: number; failed: number; crmStats?: CRMSyncStats }) => void) => () => void;
}

// Contact IPC
export interface ContactAPI {
  fetchGroups: (accountId: string) => Promise<WhatsAppGroup[]>;
  fetchPersonalChats: (accountId: string) => Promise<PersonalChat[]>;
  extractFromGroups: (accountId: string, groupIds: string[]) => Promise<ExtractedContact[]>;
  extractFromChats: (accountId: string, chatJids: string[]) => Promise<ExtractedContact[]>;
  exportToExcel: (options: ExportOptions) => Promise<string>;
  saveContacts: (contacts: ExtractedContact[]) => Promise<void>;
  getSavedContacts: () => Promise<ExtractedContact[]>;
}

// Scheduler IPC
export interface SchedulerAPI {
  createJob: (input: CreateJobInput) => Promise<ScheduledJob>;
  getAllJobs: () => Promise<ScheduledJob[]>;
  cancelJob: (jobId: string) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  getMessageHistory: (filter?: MessageHistoryFilter) => Promise<MessageHistoryResult>;
  onJobProgress: (callback: (progress: JobProgress) => void) => () => void;
}

// License IPC
export interface LicenseAPI {
  validate: (payload: LicensePayload) => Promise<LicenseState>;
  activate: (licenseString: string) => Promise<LicenseState>;
  getState: () => Promise<LicenseState>;
  getFingerprint: () => Promise<string>;
  openLicensePage: () => Promise<void>;
  clear: () => Promise<void>;
}

// Customer CRM IPC
export interface CustomerAPI {
  create: (input: CreateCustomerInput) => Promise<Customer>;
  getAll: (filter?: CustomerFilter) => Promise<Customer[]>;
  getById: (id: string) => Promise<Customer | null>;
  update: (input: UpdateCustomerInput) => Promise<Customer>;
  delete: (id: string) => Promise<void>;
  search: (filter: CustomerFilter) => Promise<Customer[]>;
  getStats: () => Promise<CRMDashboardStats>;
  export: (filter?: CustomerFilter) => Promise<string>;
}

// Product CRM IPC
export interface ProductAPI {
  create: (input: CreateProductInput) => Promise<Product>;
  getAll: () => Promise<Product[]>;
  update: (input: UpdateProductInput) => Promise<Product>;
  delete: (id: string) => Promise<void>;
}

// Payment CRM IPC
export interface PaymentAPI {
  create: (input: CreatePaymentInput) => Promise<Payment>;
  getAll: (filter?: PaymentFilter) => Promise<Payment[]>;
  getByCustomer: (customerId: string) => Promise<Payment[]>;
  update: (input: UpdatePaymentInput) => Promise<Payment>;
  delete: (id: string) => Promise<void>;
  export: (filter?: PaymentFilter) => Promise<string>;
}

// Update API
export interface UpdateAPI {
  onUpdateAvailable: (callback: (info: { version: string }) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  install: () => Promise<void>;
}

// Combined API exposed to renderer
export interface ElectronAPI {
  account: AccountAPI;
  message: MessageAPI;
  contact: ContactAPI;
  scheduler: SchedulerAPI;
  license: LicenseAPI;
  customer: CustomerAPI;
  product: ProductAPI;
  payment: PaymentAPI;
  update: UpdateAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
