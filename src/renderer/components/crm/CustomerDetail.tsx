import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Customer,
  Payment,
  CUSTOMER_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
} from '../../../shared/types';

interface CustomerDetailProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  fetchPayments: (customerId: string) => Promise<Payment[]>;
  onEdit: (customer: Customer) => void;
  onSendMessage: (customer: Customer) => void;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({
  isOpen,
  onClose,
  customer,
  fetchPayments,
  onEdit,
  onSendMessage,
}) => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      setLoading(true);
      fetchPayments(customer.id)
        .then(setPayments)
        .catch(() => setPayments([]))
        .finally(() => setLoading(false));
    }
  }, [customer, isOpen, fetchPayments]);

  if (!customer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={customer.fullName} size="lg">
      <div className="space-y-5">
        {/* Customer Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">{t('crm.customers.name')}</p>
            <p className="font-medium">{customer.fullName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('crm.customers.phone')}</p>
            <p className="font-mono text-sm">{customer.phoneNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('common.status')}</p>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CUSTOMER_STATUS_COLORS[customer.status]}`}>
              {customer.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('crm.payments.amount')}</p>
            <p className="font-semibold text-green-600">{customer.totalPaid.toFixed(2)}</p>
          </div>
          {customer.notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">{t('crm.customers.notes')}</p>
              <p className="text-sm text-gray-700">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSendMessage(customer)}>
            {t('common.send')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { onClose(); onEdit(customer); }}>
            {t('common.edit')}
          </Button>
        </div>

        {/* Payment History */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {t('crm.payments.title')} ({payments.length})
          </h4>
          {loading ? (
            <p className="text-sm text-gray-400">{t('common.loading')}</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-gray-400">{t('crm.payments.noPayments')}</p>
          ) : (
            <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('crm.products.title')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('crm.products.price')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('crm.payments.amount')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('crm.payments.amount')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('crm.payments.method')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('crm.payments.date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2">{p.productName}</td>
                      <td className="px-3 py-2">{p.productPrice.toFixed(2)}</td>
                      <td className="px-3 py-2">{p.discount > 0 ? `-${p.discount.toFixed(2)}` : '-'}</td>
                      <td className="px-3 py-2 font-medium">{p.finalAmount.toFixed(2)}</td>
                      <td className="px-3 py-2">{PAYMENT_METHOD_LABELS[p.paymentMethod as PaymentMethod] ?? p.paymentMethod}</td>
                      <td className="px-3 py-2">{p.paymentDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
