import { create } from 'zustand';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerFilter,
  CustomerSource,
  CRMDashboardStats,
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

  // Customers
  customers: Customer[];
  customerFilter: CustomerFilter;
  selectedCustomer: Customer | null;
  stats: CRMDashboardStats | null;
  customerSources: CustomerSource[];

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
  fetchCustomers: (filter?: CustomerFilter) => Promise<void>;
  createCustomer: (input: CreateCustomerInput) => Promise<Customer>;
  updateCustomer: (input: UpdateCustomerInput) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  setCustomerFilter: (filter: CustomerFilter) => void;
  selectCustomer: (customer: Customer | null) => void;
  fetchStats: () => Promise<void>;
  fetchCustomerSources: () => Promise<void>;
  fetchCustomersWithFilter: (filter: CustomerFilter) => Promise<Customer[]>;
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
  selectedCustomer: null,
  stats: null,
  customerSources: [],
  tags: [],
  products: [],
  payments: [],
  paymentFilter: {},
  isLoading: false,
  error: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  // ============ CUSTOMERS ============

  fetchCustomers: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const f = filter ?? get().customerFilter;
      const customers = await window.electronAPI.customer.getAll(f);
      set({ customers, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createCustomer: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const customer = await window.electronAPI.customer.create(input);
      set((state) => ({
        customers: [customer, ...state.customers],
        isLoading: false,
      }));
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
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
        selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  setCustomerFilter: (filter) => {
    set({ customerFilter: filter });
    get().fetchCustomers(filter);
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

  fetchCustomersWithFilter: async (filter) => {
    return await window.electronAPI.customer.getAll(filter);
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
