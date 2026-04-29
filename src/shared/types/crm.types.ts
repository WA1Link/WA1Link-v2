// Customer Statuses (Azerbaijani)
export const CUSTOMER_STATUSES = [
  'Potensial müştəri',
  'Konsultasiya olunub',
  'Cavab vermədi',
  'Söz verib',
  'Müştəri',
  'İtirilmiş müştəri',
] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_COLORS: Record<CustomerStatus, string> = {
  'Potensial müştəri': 'bg-blue-100 text-blue-800',
  'Konsultasiya olunub': 'bg-yellow-100 text-yellow-800',
  'Cavab vermədi': 'bg-red-100 text-red-800',
  'Söz verib': 'bg-orange-100 text-orange-800',
  'Müştəri': 'bg-green-100 text-green-800',
  'İtirilmiş müştəri': 'bg-gray-100 text-gray-600',
};

export const DEFAULT_CUSTOMER_STATUS: CustomerStatus = 'Potensial müştəri';

// Payment methods
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Nağd',
  bank_transfer: 'Bank köçürməsi',
  card: 'Kart',
};

// --- Customer ---

export type CustomerSourceType = 'group' | 'chat' | 'manual' | 'imported';

export const CUSTOMER_SOURCE_TYPES: CustomerSourceType[] = ['group', 'chat', 'manual', 'imported'];

export interface Customer {
  id: string;
  fullName: string;
  phoneNumber: string;
  status: CustomerStatus;
  notes: string | null;
  totalPaid: number;
  isActive: boolean;
  sourceType: CustomerSourceType;
  sourceName: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  fullName: string;
  phoneNumber: string;
  status?: CustomerStatus;
  notes?: string;
  sourceType?: CustomerSourceType;
  sourceName?: string | null;
  tagIds?: string[];
}

export interface UpdateCustomerInput {
  id: string;
  fullName?: string;
  phoneNumber?: string;
  status?: CustomerStatus;
  notes?: string;
  isActive?: boolean;
  /** When provided, replaces the customer's tags with this list. */
  tagIds?: string[];
}

/** A distinct (sourceType, sourceName) tuple as seen in the customers table. */
export interface CustomerSource {
  sourceType: CustomerSourceType;
  sourceName: string | null;
  count: number;
}

// --- Tags ---

export interface Tag {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateTagInput {
  id: string;
  name?: string;
  color?: string;
  sortOrder?: number;
}

export const DEFAULT_TAG_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#3b82f6', '#a855f7', '#ec4899', '#14b8a6',
] as const;

// --- Product ---

export interface Product {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  price: number;
}

export interface UpdateProductInput {
  id: string;
  name?: string;
  price?: number;
  isActive?: boolean;
}

// --- Payment ---

export interface Payment {
  id: string;
  customerId: string;
  productId: string;
  productPrice: number;
  discount: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields for display
  customerName?: string;
  customerPhone?: string;
  productName?: string;
}

export interface CreatePaymentInput {
  customerId: string;
  productId: string;
  productPrice: number;
  discount?: number;
  paymentMethod?: PaymentMethod;
  paymentDate: string;
}

export interface UpdatePaymentInput {
  id: string;
  productId?: string;
  productPrice?: number;
  discount?: number;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
}

// --- Filters ---

export interface CustomerFilter {
  search?: string;
  status?: CustomerStatus | '';
  isActive?: boolean;
  sourceType?: CustomerSourceType | '';
  /** When sourceType='group', restrict to a specific group name. Ignored otherwise. */
  sourceName?: string | null;
  /**
   * Restrict to customers tagged with ANY of these tag ids (OR semantics).
   * Empty/omitted = no tag restriction.
   */
  tagIds?: string[];
}

export interface PaymentFilter {
  customerId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// --- Dashboard Stats ---

export interface CRMDashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  totalPayments: number;
  statusCounts: Record<CustomerStatus, number>;
}
