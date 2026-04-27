import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLicenseStore } from '../../stores/useLicenseStore';
import { LicenseForm } from './LicenseForm';

interface LicenseGateProps {
  children: React.ReactNode;
}

export const LicenseGate: React.FC<LicenseGateProps> = ({ children }) => {
  const { t } = useTranslation();
  const { licenseState, isLoading, checkLicenseState, fetchFingerprint } = useLicenseStore();

  useEffect(() => {
    checkLicenseState();
    fetchFingerprint();
  }, [checkLicenseState, fetchFingerprint]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-whatsapp-light mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="mt-4 text-gray-600">{t('license.verifying')}</p>
        </div>
      </div>
    );
  }

  if (!licenseState.isValid) {
    return <LicenseForm />;
  }

  return <>{children}</>;
};
