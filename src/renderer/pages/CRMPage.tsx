import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCRMStore } from '../stores/useCRMStore';
import { useUIStore } from '../stores/useUIStore';
import { CRMDashboard } from '../components/crm/CRMDashboard';
import { CustomerList } from '../components/crm/CustomerList';
import { CustomerForm } from '../components/crm/CustomerForm';
import { CustomerDetail } from '../components/crm/CustomerDetail';
import { ProductList } from '../components/crm/ProductList';
import { ProductForm } from '../components/crm/ProductForm';
import { PaymentList } from '../components/crm/PaymentList';
import { PaymentForm } from '../components/crm/PaymentForm';
import {
  Customer,
  Product,
  Payment,
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateProductInput,
  UpdateProductInput,
  CreatePaymentInput,
  UpdatePaymentInput,
} from '../../shared/types';

type CRMTab = 'customers' | 'products' | 'payments';

export const CRMPage: React.FC = () => {
  const { t } = useTranslation();
  const store = useCRMStore();
  const addToast = useUIStore((s) => s.addToast);

  const tabs: { id: CRMTab; label: string }[] = [
    { id: 'customers', label: t('crm.customers.title') },
    { id: 'products', label: t('crm.products.title') },
    { id: 'payments', label: t('crm.payments.title') },
  ];

  // Modals
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // Load data on mount
  useEffect(() => {
    store.fetchCustomers();
    store.fetchProducts();
    store.fetchPayments();
    store.fetchStats();
  }, []);

  // Customer handlers
  const handleCustomerSubmit = async (input: CreateCustomerInput | UpdateCustomerInput) => {
    if ('id' in input) {
      await store.updateCustomer(input);
      addToast({ type: 'success', message: t('crm.customers.title') });
    } else {
      await store.createCustomer(input);
      addToast({ type: 'success', message: t('crm.customers.addCustomer') });
    }
    store.fetchStats();
  };

  const handleCustomerDelete = async (id: string) => {
    await store.deleteCustomer(id);
    addToast({ type: 'success', message: t('crm.customers.deleteConfirm') });
    store.fetchStats();
  };

  const handleSendMessage = (customer: Customer) => {
    // Navigate to messaging page with the customer phone number
    // This integrates with the existing messaging system
    useUIStore.getState().navigateTo('messaging');
    addToast({ type: 'info', message: customer.phoneNumber });
  };

  // Product handlers
  const handleProductSubmit = async (input: CreateProductInput | UpdateProductInput) => {
    if ('id' in input) {
      await store.updateProduct(input);
      addToast({ type: 'success', message: t('crm.products.title') });
    } else {
      await store.createProduct(input);
      addToast({ type: 'success', message: t('crm.products.addProduct') });
    }
  };

  const handleProductDelete = async (id: string) => {
    await store.deleteProduct(id);
    addToast({ type: 'success', message: t('crm.products.deleteConfirm') });
  };

  // Payment handlers
  const handlePaymentSubmit = async (input: CreatePaymentInput | UpdatePaymentInput) => {
    if ('id' in input) {
      await store.updatePayment(input);
      addToast({ type: 'success', message: t('crm.payments.title') });
    } else {
      await store.createPayment(input);
      addToast({ type: 'success', message: t('crm.payments.addPayment') });
    }
  };

  const handlePaymentDelete = async (id: string) => {
    await store.deletePayment(id);
    addToast({ type: 'success', message: t('crm.payments.deleteConfirm') });
  };

  const handleExportCustomers = async () => {
    try {
      await store.exportCustomers();
      addToast({ type: 'success', message: t('common.confirm') });
    } catch {
      // cancelled or error
    }
  };

  const handleExportPayments = async () => {
    try {
      await store.exportPayments();
      addToast({ type: 'success', message: t('common.confirm') });
    } catch {
      // cancelled or error
    }
  };

  const fetchCustomerPayments = useCallback(
    (customerId: string) => store.fetchCustomerPayments(customerId),
    []
  );

  return (
    <div className="space-y-6">
      {/* Dashboard */}
      <CRMDashboard stats={store.stats} />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => store.setActiveTab(tab.id)}
              className={`
                px-6 py-3 text-sm font-medium border-b-2 transition-colors
                ${
                  store.activeTab === tab.id
                    ? 'border-whatsapp-dark text-whatsapp-dark'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error */}
      {store.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{store.error}</span>
          <button onClick={() => store.setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tab Content */}
      {store.activeTab === 'customers' && (
        <CustomerList
          customers={store.customers}
          isLoading={store.isLoading}
          filter={store.customerFilter}
          onFilterChange={store.setCustomerFilter}
          onAdd={() => { setEditingCustomer(null); setCustomerFormOpen(true); }}
          onEdit={(c) => { setEditingCustomer(c); setCustomerFormOpen(true); }}
          onDelete={handleCustomerDelete}
          onViewDetails={(c) => setDetailCustomer(c)}
          onSendMessage={handleSendMessage}
          onExport={handleExportCustomers}
        />
      )}

      {store.activeTab === 'products' && (
        <ProductList
          products={store.products}
          isLoading={store.isLoading}
          onAdd={() => { setEditingProduct(null); setProductFormOpen(true); }}
          onEdit={(p) => { setEditingProduct(p); setProductFormOpen(true); }}
          onDelete={handleProductDelete}
        />
      )}

      {store.activeTab === 'payments' && (
        <PaymentList
          payments={store.payments}
          customers={store.customers}
          products={store.products}
          isLoading={store.isLoading}
          filter={store.paymentFilter}
          onFilterChange={store.setPaymentFilter}
          onAdd={() => { setEditingPayment(null); setPaymentFormOpen(true); }}
          onEdit={(p) => { setEditingPayment(p); setPaymentFormOpen(true); }}
          onDelete={handlePaymentDelete}
          onExport={handleExportPayments}
        />
      )}

      {/* Modals */}
      <CustomerForm
        isOpen={customerFormOpen}
        onClose={() => setCustomerFormOpen(false)}
        onSubmit={handleCustomerSubmit}
        customer={editingCustomer}
      />

      <CustomerDetail
        isOpen={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
        customer={detailCustomer}
        fetchPayments={fetchCustomerPayments}
        onEdit={(c) => { setDetailCustomer(null); setEditingCustomer(c); setCustomerFormOpen(true); }}
        onSendMessage={handleSendMessage}
      />

      <ProductForm
        isOpen={productFormOpen}
        onClose={() => setProductFormOpen(false)}
        onSubmit={handleProductSubmit}
        product={editingProduct}
      />

      <PaymentForm
        isOpen={paymentFormOpen}
        onClose={() => setPaymentFormOpen(false)}
        onSubmit={handlePaymentSubmit}
        customers={store.customers}
        products={store.products}
        payment={editingPayment}
      />
    </div>
  );
};
