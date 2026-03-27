import React, { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CUSTOMER_STATUSES,
  DEFAULT_CUSTOMER_STATUS,
} from '../../../shared/types';

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateCustomerInput | UpdateCustomerInput) => Promise<void>;
  customer?: Customer | null;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customer,
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<string>(DEFAULT_CUSTOMER_STATUS);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!customer;

  useEffect(() => {
    if (customer) {
      setFullName(customer.fullName);
      setPhoneNumber(customer.phoneNumber);
      setStatus(customer.status);
      setNotes(customer.notes ?? '');
    } else {
      setFullName('');
      setPhoneNumber('');
      setStatus(DEFAULT_CUSTOMER_STATUS);
      setNotes('');
    }
    setError(null);
  }, [customer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Ad soyad daxil edin.');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Telefon nömrəsi daxil edin.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await onSubmit({
          id: customer!.id,
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          status: status as any,
          notes: notes.trim() || undefined,
        } as UpdateCustomerInput);
      } else {
        await onSubmit({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          status: status as any,
          notes: notes.trim() || undefined,
        } as CreateCustomerInput);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = CUSTOMER_STATUSES.map((s) => ({ value: s, label: s }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Müştərini redaktə et' : 'Yeni müştəri'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Ad Soyad"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Müştərinin adı soyadı"
          required
        />

        <Input
          label="Telefon nömrəsi"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="994XXXXXXXXX"
          required
        />

        <Dropdown
          label="Status"
          options={statusOptions}
          value={status}
          onChange={setStatus}
        />

        <Textarea
          label="Qeydlər"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Əlavə qeydlər..."
          rows={3}
        />

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} type="button">
            Ləğv et
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Yadda saxla' : 'Əlavə et'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
