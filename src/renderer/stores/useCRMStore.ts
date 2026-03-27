import { create } from 'zustand';
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
} from '../../shared/types';

type CRMTab = 'customers' | 'products' | 'payments';

interface CRMState {
  // Tab
  activeTab: CRMTab;

  // Customers
  customers: Customer[];
  customerFilter: CustomerFilter;
  selectedCustomer: Customer | null;
  stats: CRMDashboardStats | null;

  // Products
  products: Product[];

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
  exportCustomers: () => Promise<string>;

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

  exportCustomers: async () => {
    try {
      return await window.electronAPI.customer.export(get().customerFilter);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
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
