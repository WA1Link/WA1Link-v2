import React from 'react';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { ScheduledJob } from '../../../shared/types';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';

interface ScheduledJobListProps {
  jobs: ScheduledJob[];
  onCancel: (jobId: string) => void;
  onDelete: (jobId: string) => void;
}

export const ScheduledJobList: React.FC<ScheduledJobListProps> = ({
  jobs,
  onCancel,
  onDelete,
}) => {
  const { t } = useTranslation();
  const getStatusBadge = (status: ScheduledJob['status']) => {
    switch (status) {
      case 'pending':
        return <span className="badge-warning">{t('schedulerUi.job.statusPending')}</span>;
      case 'running':
        return <span className="badge-info">{t('schedulerUi.job.statusRunning')}</span>;
      case 'completed':
        return <span className="badge-success">{t('schedulerUi.job.statusCompleted')}</span>;
      case 'failed':
        return <span className="badge-error">{t('schedulerUi.job.statusFailed')}</span>;
      case 'cancelled':
        return <span className="badge bg-gray-100 text-gray-600">{t('schedulerUi.job.statusCancelled')}</span>;
      default:
        return null;
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="mt-2">{t('schedulerUi.noJobs')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div key={job.id} className="card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-medium text-gray-900">{job.name}</h3>
              <p className="text-sm text-gray-500">
                {t('schedulerUi.job.scheduledFor', { date: moment(job.scheduledAt).format('MMM D, YYYY h:mm A') })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(job.status)}
            </div>
          </div>

          {/* Progress */}
          {(job.status === 'running' || job.status === 'completed') && (
            <div className="mb-4">
              <ProgressBar
                value={job.sentCount + job.failedCount}
                max={job.totalCount}
                size="sm"
                color={job.status === 'completed' ? 'success' : 'primary'}
              />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>
                  {t('schedulerUi.job.sentFailed', { sent: job.sentCount, failed: job.failedCount })}
                </span>
                <span>{t('schedulerUi.job.totalCount', { count: job.totalCount })}</span>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">{t('schedulerUi.job.templates')}</span>
              <span className="ml-2 font-medium">{job.templateIds.length}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('schedulerUi.job.recipients')}</span>
              <span className="ml-2 font-medium">{job.totalCount}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('common.createdAt')}:</span>
              <span className="ml-2 font-medium">{moment(job.createdAt).format('MMM D, YYYY h:mm A')}</span>
            </div>
          </div>

          {/* Error message */}
          {job.errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">
              {job.errorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {(job.status === 'pending' || job.status === 'running') && (
              <Button variant="danger" size="sm" onClick={() => onCancel(job.id)}>
                {t('common.cancel')}
              </Button>
            )}
            {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
              <Button variant="ghost" size="sm" onClick={() => onDelete(job.id)}>
                {t('common.delete')}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
