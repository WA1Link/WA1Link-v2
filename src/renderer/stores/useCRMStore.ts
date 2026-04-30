import { create } from 'zustand';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerFilter,
  CustomerSource,
  CustomerOption,
  CRMDashboardStats,
  PaginationInput,
  PaginatedCustomers,
  DEFAULT_CUSTOMER_PAGE_SIZE,
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
} from '../../shared/types';

type CRMTab = 'customers' | 'products' | 'payments' | 'tags';

interface CRMState {
  // Tab
  activeTab: CRMTab;

  // Customers — `customers` holds the current page only.
  customers: Customer[];
  customerFilter: CustomerFilter;
  customerPage: number;
  customerPageSize: number;
  customerTotal: number;
  selectedCustomer: Customer | null;
  stats: CRMDashboardStats | null;
  customerSources: CustomerSource[];
  /** Slim id+name+phone projection for dropdowns (PaymentList, PaymentForm). */
  customerOptions: CustomerOption[];

  // Products
  products: Product[];

  // Tags
  tags: Tag[];

  // Payments
  payments: Payment[];
  paymentFilter: PaymentFilter;

  // UI
  isLoading: boolean;
  error: string | null;
}

interface CRMActions {
  setActiveTab: (tab: CRMTab) => void;

  // Customer actions
  fetchCustomers: (filter?: CustomerFilter, page?: number) => Promise<void>;
  createCustomer: (input: CreateCustomerInput) => Promise<Customer>;
  updateCustomer: (input: UpdateCustomerInput) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  setCustomerFilter: (filter: CustomerFilter) => void;
  setCustomerPage: (page: number) => void;
  setCustomerPageSize: (size: number) => void;
  selectCustomer: (customer: Customer | null) => void;
  fetchStats: () => Promise<void>;
  fetchCustomerSources: () => Promise<void>;
  /** Returns one page (default size) for callers that don't manage pagination
   *  themselves (e.g. CRMTargetPicker before its own paging refactor). */
  fetchCustomersWithFilter: (
    filter: CustomerFilter,
    pagination?: PaginationInput
  ) => Promise<PaginatedCustomers>;
  fetchCustomerOptions: () => Promise<void>;
  exportCustomers: () => Promise<string>;

  // Tag actions
  fetchTags: () => Promise<void>;
  createTag: (input: CreateTagInput) => Promise<Tag>;
  updateTag: (input: UpdateTagInput) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  setCustomerTags: (customerId: string, tagIds: string[]) => Promise<void>;

  // Product actions
  fetchProducts: () => Promise<void>;
  createProduct: (input: CreateProductInput) => Promise<Product>;
  updateProduct: (input: UpdateProductInput) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;

  // Payment actions
  fetchPayments: (filter?: PaymentFilter) => Promise<void>;
  fetchCustomerPayments: (customerId: string) => Promise<Payment[]>;
  createPayment: (input: CreatePaymentInput) => Promise<Payment>;
  updatePayment: (input: UpdatePaymentInput) => Promise<Payment>;
  deletePayment: (id: string) => Promise<void>;
  setPaymentFilter: (filter: PaymentFilter) => void;
  exportPayments: () => Promise<string>;

  setError: (error: string | null) => void;
}

type CRMStore = CRMState & CRMActions;

export const useCRMStore = create<CRMStore>((set, get) => ({
  // Initial state
  activeTab: 'customers',
  customers: [],
  customerFilter: {},
  customerPage: 1,
  customerPageSize: DEFAULT_CUSTOMER_PAGE_SIZE,
  customerTotal: 0,
  selectedCustomer: null,
  stats: null,
  customerSources: [],
  customerOptions: [],
  tags: [],
  products: [],
  payments: [],
  paymentFilter: {},
  isLoading: false,
  error: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  // ============ CUSTOMERS ============

  fetchCustomers: async (filter, page) => {
    set({ isLoading: true, error: null });
    try {
      const state = get();
      const f = filter ?? state.customerFilter;
      const targetPage = page ?? state.customerPage;
      const result = await window.electronAPI.customer.getPage(f, {
        page: targetPage,
        pageSize: state.customerPageSize,
      });
      set({
        customers: result.items,
        customerTotal: result.total,
        customerPage: result.page,
        customerPageSize: result.pageSize,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createCustomer: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const customer = await window.electronAPI.customer.create(input);
      // Jump to page 1 so the just-created row (which sorts to the top by
      // created_at DESC) is visible. Also keep the slim options list fresh.
      set({ customerPage: 1 });
      await get().fetchCustomers(undefined, 1);
      get().fetchCustomerOptions();
      set({ isLoading: false });
      return customer;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateCustomer: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await window.electronAPI.customer.update(input);
      set((state) => ({
        customers: state.customers.map((c) => (c.id === updated.id ? updated : c)),
        selectedCustomer: state.selectedCustomer?.id === updated.id ? updated : state.selectedCustomer,
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteCustomer: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await window.electronAPI.customer.delete(id);
      // Re-fetch the page rather than splicing in place — the deleted row may
      // have left the page short, and totals/page count need to update.
      const state = get();
      set({
        selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer,
      });
      await get().fetchCustomers();
      get().fetchCustomerOptions();
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  setCustomerFilter: (filter) => {
    // Reset to page 1 on filter change so the user sees results from the top.
    set({ customerFilter: filter, customerPage: 1 });
    get().fetchCustomers(filter, 1);
  },

  setCustomerPage: (page) => {
    set({ customerPage: page });
    get().fetchCustomers(undefined, page);
  },

  setCustomerPageSize: (size) => {
    set({ customerPageSize: size, customerPage: 1 });
    get().fetchCustomers(undefined, 1);
  },

  selectCustomer: (customer) => set({ selectedCustomer: customer }),

  fetchStats: async () => {
    try {
      const stats = await window.electronAPI.customer.getStats();
      set({ stats });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchCustomerSources: async () => {
    try {
      const customerSources = await window.electronAPI.customer.getSources();
      set({ customerSources });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchCustomersWithFilter: async (filter, pagination) => {
    const p = pagination ?? { page: 1, pageSize: DEFAULT_CUSTOMER_PAGE_SIZE };
    return await window.electronAPI.customer.getPage(filter, p);
  },

  fetchCustomerOptions: async () => {
    try {
      const customerOptions = await window.electronAPI.customer.getAllForSelect();
      set({ customerOptions });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  exportCustomers: async () => {
    try {
      return await window.electronAPI.customer.export(get().customerFilter);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // ============ TAGS ============

  fetchTags: async () => {
    try {
      const tags = await window.electronAPI.tag.getAll();
      set({ tags });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createTag: async (input) => {
    const tag = await window.electronAPI.tag.create(input);
    set((s) => ({ tags: [...s.tags, tag].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)) }));
    return tag;
  },

  updateTag: async (input) => {
    const updated = await window.electronAPI.tag.update(input);
    set((s) => ({
      tags: s.tags.map((t) => (t.id === updated.id ? updated : t)),
      // Also patch the embedded tag list on each customer.
      customers: s.customers.map((c) => ({
        ...c,
        tags: c.tags.map((t) => (t.id === updated.id ? updated : t)),
      })),
    }));
    return updated;
  },

  deleteTag: async (id) => {
    await window.electronAPI.tag.delete(id);
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      // Strip the deleted tag from all customers in cache (FK cascade did it in DB).
      customers: s.customers.map((c) => ({ ...c, tags: c.tags.filter((t) => t.id !== id) })),
    }));
  },

  setCustomerTags: async (customerId, tagIds) => {
    await window.electronAPI.tag.setForCustomer(customerId, tagIds);
    // Refresh the customer list so the UI reflects new tag assignments.
    await get().fetchCustomers();
  },

  // ============ PRODUCTS ============

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const products = await window.electronAPI.product.getAll();
      set({ products, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createProduct: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const product = await window.electronAPI.product.create(input);
      set((state) => ({
        products: [product, ...state.products],
        isLoading: false,
      }));
      return product;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateProduct: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await window.electronAPI.product.update(input);
      set((state) => ({
        products: state.products.map((p) => (p.id === updated.id ? updated : p)),
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await window.electronAPI.product.delete(id);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // ============ PAYMENTS ============

  fetchPayments: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const f = filter ?? get().paymentFilter;
      const payments = await window.electronAPI.payment.getAll(f);
      set({ payments, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchCustomerPayments: async (customerId) => {
    try {
      return await window.electronAPI.payment.getByCustomer(customerId);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  createPayment: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const payment = await window.electronAPI.payment.create(input);
      set((state) => ({
        payments: [payment, ...state.payments],
        isLoading: false,
      }));
      // Refresh customers to update total_paid
      get().fetchCustomers();
      get().fetchStats();
      return payment;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updatePayment: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await window.electronAPI.payment.update(input);
      set((state) => ({
        payments: state.payments.map((p) => (p.id === updated.id ? updated : p)),
        isLoading: false,
      }));
      get().fetchCustomers();
      get().fetchStats();
      return updated;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deletePayment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await window.electronAPI.payment.delete(id);
      set((state) => ({
        payments: state.payments.filter((p) => p.id !== id),
        isLoading: false,
      }));
      get().fetchCustomers();
      get().fetchStats();
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  setPaymentFilter: (filter) => {
    set({ paymentFilter: filter });
    get().fetchPayments(filter);
  },

  exportPayments: async () => {
    try {
      return await window.electronAPI.payment.export(get().paymentFilter);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  setError: (error) => set({ error }),
}));
