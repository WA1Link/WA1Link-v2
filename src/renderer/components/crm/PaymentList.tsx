import React, { useState } from 'react';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Modal, ModalFooter } from '../ui/Modal';
import {
  Payment,
  PaymentFilter,
  Customer,
  Product,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
} from '../../../shared/types';

interface PaymentListProps {
  payments: Payment[];
  customers: Customer[];
  products: Product[];
  isLoading: boolean;
  filter: PaymentFilter;
  onFilterChange: (filter: PaymentFilter) => void;
  onAdd: () => void;
  onEdit: (payment: Payment) => void;
  onDelete: (id: string) => Promise<void>;
  onExport: () => void;
}

export const PaymentList: React.FC<PaymentListProps> = ({
  payments,
  customers,
  products,
  isLoading,
  filter,
  onFilterChange,
  onAdd,
  onEdit,
  onDelete,
  onExport,
}) => {
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Error handled by store
    }
  };

  const customerOptions = [
    { value: '', label: 'Bütün müştərilər' },
    ...customers.map((c) => ({ value: c.id, label: c.fullName })),
  ];

  const productOptions = [
    { value: '', label: 'Bütün məhsullar' },
    ...products.map((p) => ({ value: p.id, label: p.name })),
  ];

  const columns = [
    {
      key: 'customerName',
      header: 'Müştəri',
      render: (p: Payment) => <span className="font-medium">{p.customerName}</span>,
    },
    {
      key: 'productName',
      header: 'Məhsul',
      render: (p: Payment) => <span>{p.productName}</span>,
    },
    {
      key: 'productPrice',
      header: 'Qiymət',
      render: (p: Payment) => <span>{p.productPrice.toFixed(2)}</span>,
    },
    {
      key: 'discount',
      header: 'Endirim',
      render: (p: Payment) => (
        <span className={p.discount > 0 ? 'text-orange-600' : 'text-gray-400'}>
          {p.discount > 0 ? `-${p.discount.toFixed(2)}` : '-'}
        </span>
      ),
    },
    {
      key: 'finalAmount',
      header: 'Yekun',
      render: (p: Payment) => <span className="font-semibold text-green-700">{p.finalAmount.toFixed(2)}</span>,
    },
    {
      key: 'paymentMethod',
      header: 'Üsul',
      render: (p: Payment) => (
        <span className="text-xs">{PAYMENT_METHOD_LABELS[p.paymentMethod as PaymentMethod] ?? p.paymentMethod}</span>
      ),
    },
    {
      key: 'paymentDate',
      header: 'Tarix',
      render: (p: Payment) => <span className="text-xs">{p.paymentDate}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (p: Payment) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onEdit(p); }}
            title="Redaktə et"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
            title="Sil"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-44">
          <Dropdown
            options={customerOptions}
            value={filter.customerId ?? ''}
            onChange={(v) => onFilterChange({ ...filter, customerId: v || undefined })}
            placeholder="Müştəri filtr"
          />
        </div>
        <div className="w-44">
          <Dropdown
            options={productOptions}
            value={filter.productId ?? ''}
            onChange={(v) => onFilterChange({ ...filter, productId: v || undefined })}
            placeholder="Məhsul filtr"
          />
        </div>
        <Input
          type="date"
          value={filter.dateFrom ?? ''}
          onChange={(e) => onFilterChange({ ...filter, dateFrom: e.target.value || undefined })}
          placeholder="Başlanğıc"
          className="w-36"
        />
        <Input
          type="date"
          value={filter.dateTo ?? ''}
          onChange={(e) => onFilterChange({ ...filter, dateTo: e.target.value || undefined })}
          placeholder="Son"
          className="w-36"
        />
        <div className="flex-1" />
        <Button variant="secondary" onClick={onExport} size="sm">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </Button>
        <Button onClick={onAdd}>+ Yeni ödəniş</Button>
      </div>

      <Table
        columns={columns}
        data={payments}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyMessage="Ödəniş tapılmadı"
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Ödənişi sil"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Bu ödənişi silmək istədiyinizə əminsiniz?
          {deleteTarget && (
            <span className="block mt-1 font-medium">
              {deleteTarget.customerName} — {deleteTarget.productName} — {deleteTarget.finalAmount.toFixed(2)} AZN
            </span>
          )}
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Ləğv et
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Sil
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
