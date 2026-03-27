import React, { useState } from 'react';
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
      newErrors.name = 'Account name is required';
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Account" size="sm">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Account Name"
            placeholder="Enter account name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            autoFocus
          />

          <Dropdown
            label="Default Country"
            options={countryOptions}
            value={countryCode}
            onChange={setCountryCode}
          />

          <p className="text-xs text-gray-500">
            The country code will be used for normalizing phone numbers when sending messages.
          </p>
        </div>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Add Account
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
