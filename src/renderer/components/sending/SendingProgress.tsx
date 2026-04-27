import React from 'react';
import { useTranslation } from 'react-i18next';
import { SendingProgress as SendingProgressType } from '../../../shared/types';
import { ProgressBar, CircularProgress } from '../ui/ProgressBar';
import { Button } from '../ui/Button';

interface SendingProgressProps {
  progress: SendingProgressType | null;
  isSending: boolean;
  onStop: () => void;
}

export const SendingProgressComponent: React.FC<SendingProgressProps> = ({
  progress,
  isSending,
  onStop,
}) => {
  const { t } = useTranslation();
  if (!isSending && !progress) {
    return null;
  }

  const total = progress?.total ?? 0;
  const sent = progress?.sent ?? 0;
  const failed = progress?.failed ?? 0;
  const completed = sent + failed;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">
          {isSending ? t('sending.inProgress') : t('sending.complete')}
        </h3>
        {isSending && (
          <Button variant="danger" size="sm" onClick={onStop}>
            {t('sending.stopSending')}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-8">
        {/* Circular Progress */}
        <div className="flex-shrink-0">
          <CircularProgress
            value={completed}
            max={total}
            size={100}
            strokeWidth={8}
            color={failed > 0 ? 'warning' : 'primary'}
          />
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <ProgressBar
            value={completed}
            max={total}
            label={t('sending.progress')}
            color={isSending ? 'primary' : 'success'}
          />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-500">{t('sending.total')}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{sent}</p>
              <p className="text-xs text-gray-500">{t('sending.sent')}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{failed}</p>
              <p className="text-xs text-gray-500">{t('sending.failed')}</p>
            </div>
          </div>

          {/* CRM Sync Stats */}
          {progress?.crmStats && (progress.crmStats.newContacts > 0 || progress.crmStats.skippedContacts > 0) && (
            <div className="grid grid-cols-2 gap-4 text-center mt-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <p className="text-lg font-bold text-indigo-600">{progress.crmStats.newContacts}</p>
                <p className="text-xs text-gray-500">{t('sending.newCrmContacts')}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-gray-500">{progress.crmStats.skippedContacts}</p>
                <p className="text-xs text-gray-500">{t('sending.alreadyInCrm')}</p>
              </div>
            </div>
          )}

          {progress?.currentTarget && isSending && (
            <p className="text-sm text-gray-500">
              {t('sending.currentTarget', { target: progress.currentTarget })}
            </p>
          )}
        </div>
      </div>

      {/* Error List */}
      {progress?.errors && progress.errors.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {t('sending.failedMessages', { count: progress.errors.length })}
          </h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {progress.errors.map((error, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm p-2 bg-red-50 rounded"
              >
                <span className="font-mono text-gray-700">{error.phoneNumber}</span>
                <span className="text-red-600 truncate ml-4">{error.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
