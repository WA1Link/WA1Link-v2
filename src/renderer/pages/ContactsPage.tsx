import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContactExtractor } from '../components/contacts/ContactExtractor';

export const ContactsPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('pages.contacts.title')}</h1>
        <p className="text-gray-500 mt-1">{t('pages.contacts.description')}</p>
      </div>

      <ContactExtractor />
    </div>
  );
};
