import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Modal, ModalFooter } from '../ui/Modal';
import { COUNTRIES } from '../../../shared/constants/countries';

interface AccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; countryCode: string }) => void;
  isLoading?: boolean;
}

export const AccountForm: React.FC<AccountFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('994');
  const [errors, setErrors] = useState<{ name?: string }>({});

  const countryOptions = COUNTRIES.map((c) => ({
    value: c.dialCode,
    label: `${c.name} (+${c.dialCode})`,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: { name?: string } = {};
    if (!name.trim()) {
      newErrors.name = t('accounts.accountName');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({ name: name.trim(), countryCode });
    setName('');
    setCountryCode('994');
    setErrors({});
  };

  const handleClose = () => {
    setName('');
    setCountryCode('994');
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('accounts.addAccount')} size="sm">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label={t('accounts.accountName')}
            placeholder={t('accounts.accountNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            autoFocus
          />

          <Dropdown
            label={t('accounts.defaultCountry')}
            options={countryOptions}
            value={countryCode}
            onChange={setCountryCode}
          />

          <p className="text-xs text-gray-500">
            {t('accounts.defaultCountryHint')}
          </p>
        </div>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {t('accounts.addAccount')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
