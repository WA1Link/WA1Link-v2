import React from 'react';
import { ContactExtractor } from '../components/contacts/ContactExtractor';

export const ContactsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contact Extraction</h1>
        <p className="text-gray-500 mt-1">
          Extract contacts from WhatsApp groups and personal chats
        </p>
      </div>

      <ContactExtractor />
    </div>
  );
};
