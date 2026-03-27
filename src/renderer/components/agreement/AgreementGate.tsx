import React, { useState, useEffect } from 'react';
import { useLicenseStore } from '../../stores/useLicenseStore';
import { AGREEMENT_TEXT } from './agreementText';
import { Button } from '../ui/Button';

const AGREEMENT_KEY = 'wa1link_agreement_accepted';

interface AgreementGateProps {
  children: React.ReactNode;
}

export const AgreementGate: React.FC<AgreementGateProps> = ({ children }) => {
  const [accepted, setAccepted] = useState<boolean>(() => {
    return localStorage.getItem(AGREEMENT_KEY) === 'true';
  });
  const { fingerprint, fetchFingerprint } = useLicenseStore();

  useEffect(() => {
    if (!accepted) {
      fetchFingerprint();
    }
  }, [accepted, fetchFingerprint]);

  const handleAccept = () => {
    localStorage.setItem(AGREEMENT_KEY, 'true');
    setAccepted(true);
  };

  if (accepted) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">
            Proqram Təminatı İstifadə Müqaviləsi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Davam etmək üçün müqaviləni oxuyun və qəbul edin
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {AGREEMENT_TEXT}
          </div>

          {fingerprint && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <p className="text-xs font-medium text-gray-500 mb-1">Device Fingerprint</p>
              <p className="font-mono text-sm text-gray-700 break-all">{fingerprint}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 rounded-b-xl">
          <Button onClick={handleAccept} className="w-full">
            Razıyam / Agree
          </Button>
        </div>
      </div>
    </div>
  );
};
