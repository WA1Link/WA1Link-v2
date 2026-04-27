import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLicenseStore } from '../../stores/useLicenseStore';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Input';

export const LicenseForm: React.FC = () => {
  const { t } = useTranslation();
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { fingerprint, isLoading, activateLicense, licenseState } = useLicenseStore();
  const [copied, setCopied] = useState(false);

  const copyFingerprint = async () => {
    if (fingerprint) {
      await navigator.clipboard.writeText(fingerprint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = licenseKey.trim();
    if (!trimmed) {
      setError('Please enter a license key');
      return;
    }

    // Basic format check
    const parts = trimmed.split('.');
    if (parts.length !== 2) {
      setError('Invalid license format');
      return;
    }

    try {
      const result = await activateLicense(trimmed);
      if (!result.isValid) {
        setError(result.reason || 'Invalid license');
      }
    } catch (err) {
      setError('Failed to validate license. Please check the format.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-whatsapp-light rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">WTP CRM</h1>
          <p className="text-gray-500 mt-1">WhatsApp Bulk Messaging</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('license.form.title')}</h2>

          {licenseState.reason && !error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {licenseState.reason}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Textarea
                label={t('license.form.title')}
                placeholder={t('license.form.placeholder')}
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                rows={4}
                error={error || undefined}
              />

              {fingerprint && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('license.form.deviceFingerprint')}</p>
                  <p className="font-mono text-sm text-gray-700 break-all">{fingerprint}</p>
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={copyFingerprint}
                      className="text-xs px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      {copied ? t('common.copied') : t('common.copy')}
                    </button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" isLoading={isLoading}>
                {t('license.form.activate')}
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
            <p className="text-sm font-medium text-gray-700 text-center mb-3">
              {t('license.form.noLicense')}
            </p>
            <button
              type="button"
              onClick={() => window.electronAPI.license.openLicensePage()}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg shadow-md hover:from-green-600 hover:to-emerald-700 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              {t('license.form.purchase')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
