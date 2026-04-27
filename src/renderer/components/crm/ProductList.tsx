import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Modal, ModalFooter } from '../ui/Modal';
import { Product } from '../../../shared/types';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => Promise<void>;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const activeProducts = products.filter((p) => p.isActive);

  const columns = [
    {
      key: 'name',
      header: t('crm.products.name'),
      render: (p: Product) => <span className="font-medium">{p.name}</span>,
    },
    {
      key: 'price',
      header: t('crm.products.price'),
      render: (p: Product) => <span>{p.price.toFixed(2)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (p: Product) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onEdit(p); }}
            title={t('common.edit')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{activeProducts.length}</p>
        <Button onClick={onAdd}>+ {t('crm.products.addProduct')}</Button>
      </div>

      <Table
        columns={columns}
        data={activeProducts}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyMessage={t('crm.products.noProducts')}
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        title={t('crm.products.deleteConfirm')}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          <strong>{deleteTarget?.name}</strong>
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
