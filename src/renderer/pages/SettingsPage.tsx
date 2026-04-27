import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLicenseStore } from '../stores/useLicenseStore';
import { Button } from '../components/ui/Button';
import { AGREEMENT_TEXT } from '../components/agreement/agreementText';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { licenseState, fingerprint, clearLicense } = useLicenseStore();
  const [showAgreement, setShowAgreement] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('pages.settings.title')}</h1>

      {/* License Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.settings.license.title')}</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">{t('pages.settings.license.status')}</p>
              <p className="font-medium text-gray-900">
                {licenseState.isValid ? (
                  <span className="text-green-600">{t('pages.settings.license.active')}</span>
                ) : (
                  <span className="text-red-600">{t('pages.settings.license.inactive')}</span>
                )}
              </p>
            </div>
            <span
              className={`badge ${
                licenseState.isValid ? 'badge-success' : 'badge-error'
              }`}
            >
              {licenseState.isValid ? t('pages.settings.license.valid') : t('pages.settings.license.invalid')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{t('pages.settings.license.maxAccounts')}</p>
              <p className="font-medium text-gray-900">{licenseState.maxAccounts || '—'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{t('pages.settings.license.expires')}</p>
              <p className="font-medium text-gray-900">
                {licenseState.expiresAt
                  ? new Date(licenseState.expiresAt).toLocaleDateString()
                  : '—'}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">{t('pages.settings.license.deviceFingerprint')}</p>
            <p className="font-mono text-sm text-gray-700 break-all">
              {fingerprint || t('pages.settings.license.loading')}
            </p>
          </div>

          {/* Change License Button */}
          {!showConfirm ? (
            <Button
              variant="secondary"
              onClick={() => setShowConfirm(true)}
            >
              {t('pages.settings.license.change')}
            </Button>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
              <p className="text-sm text-yellow-800">
                {t('pages.settings.license.changeWarning')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    await clearLicense();
                    setShowConfirm(false);
                  }}
                >
                  {t('pages.settings.license.confirmRemove')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* About */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.settings.about.title')}</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-whatsapp-light rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('pages.settings.about.appName')}</h3>
              <p className="text-sm text-gray-500">{t('pages.settings.about.version', { version: '2.0.0' })}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600">{t('pages.settings.about.tagline')}</p>

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">{t('pages.settings.about.stack')}</p>
          </div>
        </div>
      </div>

      {/* Agreement */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('agreement.title')}
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAgreement(!showAgreement)}
          >
            {showAgreement ? t('common.hide') : t('common.show')}
          </Button>
        </div>

        {fingerprint && (
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <p className="text-sm text-gray-500 mb-1">{t('pages.settings.license.deviceFingerprint')}</p>
            <p className="font-mono text-sm text-gray-700 break-all">{fingerprint}</p>
          </div>
        )}

        {showAgreement && (
          <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-xs">
              {AGREEMENT_TEXT}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
