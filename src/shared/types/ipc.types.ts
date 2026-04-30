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
  CustomerSource,
  CustomerSourceType,
  CustomerOption,
  CRMDashboardStats,
  PaginationInput,
  PaginatedCustomers,
  Product,
  CreateProductInput,
  UpdateProductInput,
  Payment,
  CreatePaymentInput,
  UpdatePaymentInput,
  PaymentFilter,
  Tag,
  CreateTagInput,
  UpdateTagInput,
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
  onError: (callback: (data: { accountId: string; error: string }) => void) => () => void;
  onReconnecting: (callback: (data: { accountId: string; attempt: number; delayMs: number }) => void) => () => void;
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
  onError: (callback: (error: { message: string }) => void) => () => void;
  onTargetResult: (
    callback: (result: {
      targetId: string;
      templateId?: string;
      phoneNumber: string;
      status: 'sent' | 'failed';
      sentAt: string;
      errorMessage?: string;
    }) => void
  ) => () => void;
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
  /** Paginated fetch — default entry point for the CRM list and picker. */
  getPage: (filter: CustomerFilter, pagination: PaginationInput) => Promise<PaginatedCustomers>;
  /** Contiguous slice of the filtered list by global offset+limit. */
  getSlice: (filter: CustomerFilter, offset: number, limit: number) => Promise<Customer[]>;
  /** Slim id+name+phone projection for dropdowns. No tag hydration. */
  getAllForSelect: () => Promise<CustomerOption[]>;
  getById: (id: string) => Promise<Customer | null>;
  update: (input: UpdateCustomerInput) => Promise<Customer>;
  delete: (id: string) => Promise<void>;
  search: (filter: CustomerFilter) => Promise<Customer[]>;
  getStats: () => Promise<CRMDashboardStats>;
  export: (filter?: CustomerFilter) => Promise<string>;
  ensureBulk: (
    contacts: Array<{
      phone: string;
      name: string;
      sourceType?: CustomerSourceType;
      sourceName?: string | null;
    }>
  ) => Promise<{ created: number; skipped: number; failed: number }>;
  getSources: () => Promise<CustomerSource[]>;
}

// Tag CRM IPC
export interface TagAPI {
  getAll: () => Promise<Tag[]>;
  create: (input: CreateTagInput) => Promise<Tag>;
  update: (input: UpdateTagInput) => Promise<Tag>;
  delete: (id: string) => Promise<void>;
  setForCustomer: (customerId: string, tagIds: string[]) => Promise<void>;
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
  /** Fires when the running version is below the server's minimum required.
   *  The renderer should display a blocking overlay until the user updates. */
  onUpdateRequired: (
    callback: (info: { currentVersion: string; minVersion: string }) => void
  ) => () => void;
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
  tag: TagAPI;
  product: ProductAPI;
  payment: PaymentAPI;
  update: UpdateAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
