import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import {
  CustomerOption,
  Product,
  Payment,
  CreatePaymentInput,
  UpdatePaymentInput,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from '../../../shared/types';

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePaymentInput | UpdatePaymentInput) => Promise<void>;
  customers: CustomerOption[];
  products: Product[];
  payment?: Payment | null;
  preselectedCustomerId?: string;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customers,
  products,
  payment,
  preselectedCustomerId,
}) => {
  const { t } = useTranslation();
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!payment;

  useEffect(() => {
    if (payment) {
      setCustomerId(payment.customerId);
      setProductId(payment.productId);
      setProductPrice(payment.productPrice.toString());
      setDiscount(payment.discount.toString());
      setPaymentMethod(payment.paymentMethod);
      setPaymentDate(payment.paymentDate);
    } else {
      setCustomerId(preselectedCustomerId ?? '');
      setProductId('');
      setProductPrice('');
      setDiscount('0');
      setPaymentMethod('cash');
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
    setError(null);
  }, [payment, isOpen, preselectedCustomerId]);

  // Auto-fill product price when product changes
  useEffect(() => {
    if (!isEditing && productId) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        setProductPrice(product.price.toString());
      }
    }
  }, [productId, products, isEditing]);

  const finalAmount = Math.max(0, (parseFloat(productPrice) || 0) - (parseFloat(discount) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = parseFloat(productPrice);
    const discountNum = parseFloat(discount) || 0;

    if (!isEditing && !customerId) {
      setError(t('crm.payments.customer'));
      return;
    }
    if (!productId) {
      setError(t('crm.products.title'));
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError(t('crm.products.price'));
      return;
    }
    if (discountNum < 0 || discountNum > priceNum) {
      setError(t('crm.payments.amount'));
      return;
    }
    if (!paymentDate) {
      setError(t('crm.payments.date'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await onSubmit({
          id: payment!.id,
          productId,
          productPrice: priceNum,
          discount: discountNum,
          paymentMethod: paymentMethod as any,
          paymentDate,
        } as UpdatePaymentInput);
      } else {
        await onSubmit({
          customerId,
          productId,
          productPrice: priceNum,
          discount: discountNum,
          paymentMethod: paymentMethod as any,
          paymentDate,
        } as CreatePaymentInput);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCustomers = customers.filter((c) => c.isActive);
  const activeProducts = products.filter((p) => p.isActive);

  const customerOptions = activeCustomers.map((c) => ({
    value: c.id,
    label: `${c.fullName} (${c.phoneNumber})`,
  }));

  const productOptions = activeProducts.map((p) => ({
    value: p.id,
    label: `${p.name} — ${p.price.toFixed(2)} AZN`,
  }));

  const methodOptions = PAYMENT_METHODS.map((m) => ({
    value: m,
    label: t(`crm.paymentMethods.${m}` as any),
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('crm.payments.form.editTitle') : t('crm.payments.form.createTitle')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {!isEditing && (
          <Dropdown
            label={t('crm.payments.customer')}
            options={customerOptions}
            value={customerId}
            onChange={setCustomerId}
            placeholder={t('crm.payments.customer')}
          />
        )}

        <Dropdown
          label={t('crm.products.title')}
          options={productOptions}
          value={productId}
          onChange={setProductId}
          placeholder={t('crm.products.title')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('crm.products.price')}
            type="number"
            step="0.01"
            min="0"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
          />

          <Input
            label={t('crm.payments.amount')}
            type="number"
            step="0.01"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </div>

        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-sm text-gray-600">{t('crm.payments.amount')}: </span>
          <span className="text-lg font-bold text-green-700">{finalAmount.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Dropdown
            label={t('crm.payments.method')}
            options={methodOptions}
            value={paymentMethod}
            onChange={setPaymentMethod}
          />

          <Input
            label={t('crm.payments.date')}
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? t('common.save') : t('crm.payments.addPayment')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
