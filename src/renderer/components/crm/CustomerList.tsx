import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Modal, ModalFooter } from '../ui/Modal';
import {
  Customer,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_COLORS,
  CustomerFilter,
} from '../../../shared/types';

interface CustomerListProps {
  customers: Customer[];
  isLoading: boolean;
  filter: CustomerFilter;
  onFilterChange: (filter: CustomerFilter) => void;
  onAdd: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => Promise<void>;
  onViewDetails: (customer: Customer) => void;
  onSendMessage: (customer: Customer) => void;
  onExport: () => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  isLoading,
  filter,
  onFilterChange,
  onAdd,
  onEdit,
  onDelete,
  onViewDetails,
  onSendMessage,
  onExport,
}) => {
  const { t } = useTranslation();
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const statusFilterOptions = [
    { value: '', label: t('common.all') },
    ...CUSTOMER_STATUSES.map((s) => ({ value: s, label: t(`crm.customerStatus.${s}` as any) })),
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  };

  const columns = [
    {
      key: 'fullName',
      header: t('crm.customers.name'),
      render: (c: Customer) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(c);
          }}
          className="font-medium text-whatsapp-dark hover:underline"
        >
          {c.fullName}
        </button>
      ),
    },
    {
      key: 'phoneNumber',
      header: t('crm.customers.phone'),
      render: (c: Customer) => <span className="font-mono text-xs">{c.phoneNumber}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (c: Customer) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CUSTOMER_STATUS_COLORS[c.status]}`}>
          {t(`crm.customerStatus.${c.status}` as any)}
        </span>
      ),
    },
    {
      key: 'totalPaid',
      header: t('crm.payments.amount'),
      render: (c: Customer) => (
        <span className="font-medium">{c.totalPaid.toFixed(2)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-40',
      render: (c: Customer) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(c);
            }}
            title={t('common.edit')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(c);
            }}
            title={t('common.delete')}
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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('crm.customers.search')}
            value={filter.search ?? ''}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
            leftAddon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>
        <div className="w-48">
          <Dropdown
            options={statusFilterOptions}
            value={filter.status ?? ''}
            onChange={(v) => onFilterChange({ ...filter, status: v as any })}
            placeholder={t('common.status')}
          />
        </div>
        <Button variant="secondary" onClick={onExport} size="sm">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </Button>
        <Button onClick={onAdd}>+ {t('crm.customers.addCustomer')}</Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={customers}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage={t('crm.customers.noCustomers')}
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        title={t('crm.customers.deleteConfirm')}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          <strong>{deleteTarget?.fullName}</strong>
        </p>
        {deleteError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {deleteError}
          </div>
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
