import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type UpdateState = 'idle' | 'available' | 'downloaded';

export const UpdateNotification: React.FC = () => {
  const { t } = useTranslation();
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [version, setVersion] = useState('');

  useEffect(() => {
    const cleanupAvailable = window.electronAPI.update.onUpdateAvailable((info) => {
      setVersion(info.version);
      setUpdateState('available');
    });

    const cleanupDownloaded = window.electronAPI.update.onUpdateDownloaded((info) => {
      setVersion(info.version);
      setUpdateState('downloaded');
    });

    return () => {
      cleanupAvailable();
      cleanupDownloaded();
    };
  }, []);

  if (updateState === 'idle') return null;

  const handleInstall = () => {
    window.electronAPI.update.install();
  };

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
          {updateState === 'available' && (
            <>
              <p className="text-sm text-gray-700 mb-3">
                {t('update.downloading', { version })}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
                </div>
                <span className="text-xs text-gray-500">{t('update.downloadingShort')}</span>
              </div>
            </>
          )}

          {updateState === 'downloaded' && (
            <>
              <p className="text-sm text-gray-700 mb-3">
                {t('update.downloaded', { version })}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('update.restart')}
                </button>
                <button
                  onClick={() => setUpdateState('idle')}
                  className="px-4 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {t('update.later')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
