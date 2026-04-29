import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { useCRMStore } from '../../stores/useCRMStore';
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
  const { t } = useTranslation();
  const { tags: allTags, fetchTags } = useCRMStore();
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<string>(DEFAULT_CUSTOMER_STATUS);
  const [notes, setNotes] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!customer;

  useEffect(() => {
    if (isOpen) fetchTags();
  }, [isOpen, fetchTags]);

  useEffect(() => {
    if (customer) {
      setFullName(customer.fullName);
      setPhoneNumber(customer.phoneNumber);
      setStatus(customer.status);
      setNotes(customer.notes ?? '');
      setSelectedTagIds(new Set(customer.tags.map((t) => t.id)));
    } else {
      setFullName('');
      setPhoneNumber('');
      setStatus(DEFAULT_CUSTOMER_STATUS);
      setNotes('');
      setSelectedTagIds(new Set());
    }
    setError(null);
  }, [customer, isOpen]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError(t('crm.customers.name'));
      return;
    }
    if (!phoneNumber.trim()) {
      setError(t('crm.customers.phone'));
      return;
    }

    setIsSubmitting(true);
    try {
      const tagIds = Array.from(selectedTagIds);
      if (isEditing) {
        await onSubmit({
          id: customer!.id,
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          status: status as any,
          notes: notes.trim() || undefined,
          tagIds,
        } as UpdateCustomerInput);
      } else {
        await onSubmit({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          status: status as any,
          notes: notes.trim() || undefined,
          tagIds,
        } as CreateCustomerInput);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = CUSTOMER_STATUSES.map((s) => ({
    value: s,
    label: t(`crm.customerStatus.${s}` as any),
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('crm.customers.form.editTitle') : t('crm.customers.form.createTitle')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label={t('crm.customers.name')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t('crm.customers.form.namePlaceholder')}
          required
        />

        <Input
          label={t('crm.customers.phone')}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder={t('crm.customers.form.phonePlaceholder')}
          required
        />

        <Dropdown
          label={t('common.status')}
          options={statusOptions}
          value={status}
          onChange={setStatus}
        />

        <Textarea
          label={t('crm.customers.notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('crm.customers.form.notesPlaceholder')}
          rows={3}
        />

        {/* Tag picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('tags.title')}
          </label>
          {allTags.length === 0 ? (
            <p className="text-xs text-gray-500">{t('tags.noneCreatedYet')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const isOn = selectedTagIds.has(tag.id);
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition ${
                      isOn ? 'text-white' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                    }`}
                    style={isOn ? { backgroundColor: tag.color } : undefined}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? t('common.save') : t('crm.customers.addCustomer')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
