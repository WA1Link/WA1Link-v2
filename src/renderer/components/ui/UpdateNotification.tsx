import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type UpdateState = 'idle' | 'available' | 'downloaded' | 'required';

export const UpdateNotification: React.FC = () => {
  const { t } = useTranslation();
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [version, setVersion] = useState('');
  const [minVersion, setMinVersion] = useState('');

  useEffect(() => {
    const cleanupAvailable = window.electronAPI.update.onUpdateAvailable((info) => {
      setVersion(info.version);
      // 'required' outranks 'available' — once the server has gated us, the
      // banner needs to stay non-dismissible even while the download runs.
      setUpdateState((prev) => (prev === 'required' ? 'required' : 'available'));
    });

    const cleanupDownloaded = window.electronAPI.update.onUpdateDownloaded((info) => {
      setVersion(info.version);
      setUpdateState('downloaded');
    });

    const cleanupRequired = window.electronAPI.update.onUpdateRequired((info) => {
      setMinVersion(info.minVersion);
      // If the new build is already downloaded, keep that state so the user
      // can restart immediately.
      setUpdateState((prev) => (prev === 'downloaded' ? 'downloaded' : 'required'));
    });

    return () => {
      cleanupAvailable();
      cleanupDownloaded();
      cleanupRequired();
    };
  }, []);

  if (updateState === 'idle') return null;

  const handleInstall = () => {
    window.electronAPI.update.install();
  };

  // Non-blocking small toast: still used for the soft "available, downloading"
  // state when the server has *not* gated us.
  if (updateState === 'available') {
    return (
      <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span className="font-semibold text-blue-800 text-sm">{t('update.available')}</span>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-700 mb-3">
              {t('update.downloading', { version })}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
              </div>
              <span className="text-xs text-gray-500">{t('update.downloadingShort')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Blocking full-screen overlay. No close button, no Escape, no backdrop
  // click handler — the user can only restart (when the new build is ready)
  // or wait while it downloads.
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => {
        // Block Escape from doing anything useful.
        if (e.key === 'Escape') e.preventDefault();
      }}
    >
      <div className="max-w-md w-[90%] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-blue-600 text-white flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <h2 className="font-semibold text-lg">
            {updateState === 'downloaded'
              ? t('update.readyTitle', { defaultValue: 'Update ready' })
              : t('update.requiredTitle', { defaultValue: 'Update required' })}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {updateState === 'required' && (
            <>
              <p className="text-sm text-gray-700">
                {t('update.requiredBody', {
                  minVersion,
                  defaultValue:
                    'A newer version is required to continue. The update is downloading now — please wait.',
                })}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
                </div>
                <span className="text-xs text-gray-500">
                  {t('update.downloadingShort', { defaultValue: 'Downloading…' })}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {t('update.requiredHint', {
                  defaultValue:
                    'When the download finishes you will be asked to restart. The app cannot be used until then.',
                })}
              </p>
            </>
          )}

          {updateState === 'downloaded' && (
            <>
              <p className="text-sm text-gray-700">
                {t('update.downloaded', { version })}
              </p>
              <p className="text-xs text-gray-500">
                {t('update.restartHint', {
                  defaultValue: 'The app will close and reopen on the new version.',
                })}
              </p>
              <button
                onClick={handleInstall}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('update.restart')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
