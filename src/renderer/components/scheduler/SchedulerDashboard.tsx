import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useScheduleStore } from '../../stores/useScheduleStore';
import { useUIStore } from '../../stores/useUIStore';
import { ScheduledJobList } from './ScheduledJobList';
import { MessageHistoryList } from './MessageHistoryList';
import { Button } from '../ui/Button';

export const SchedulerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { jobs, isLoading, fetchJobs, cancelJob, deleteJob, updateJobProgress } = useScheduleStore();
  const { addToast } = useUIStore();

  // job-progress IPC subscription is hoisted to App-level via
  // useGlobalSubscriptions — keeps the dashboard live even when the user is
  // on another page while a job is running.
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCancel = async (jobId: string) => {
    try {
      await cancelJob(jobId);
      await deleteJob(jobId);
      addToast({ type: 'info', message: 'Campaign cancelled and removed' });
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message });
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      addToast({ type: 'success', message: 'Job deleted' });
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message });
    }
  };

  // Categorize jobs
  const pendingJobs = jobs.filter((j) => j.status === 'pending');
  const runningJobs = jobs.filter((j) => j.status === 'running');
  const completedJobs = jobs.filter((j) => ['completed', 'failed', 'cancelled'].includes(j.status));

  return (
    <div className="space-y-6">
      {/* Running Jobs */}
      {runningJobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('schedulerUi.running', { count: runningJobs.length })}
          </h2>
          <ScheduledJobList jobs={runningJobs} onCancel={handleCancel} onDelete={handleDelete} />
        </div>
      )}

      {/* Pending Jobs */}
      {pendingJobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('schedulerUi.upcoming', { count: pendingJobs.length })}
          </h2>
          <ScheduledJobList jobs={pendingJobs} onCancel={handleCancel} onDelete={handleDelete} />
        </div>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('schedulerUi.historyHeading', { count: completedJobs.length })}
          </h2>
          <ScheduledJobList jobs={completedJobs} onCancel={handleCancel} onDelete={handleDelete} />
        </div>
      )}

      {/* Sent Messages History (per-recipient) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('schedulerUi.messageHistoryTitle')}</h2>
        <MessageHistoryList jobs={jobs} />
      </div>

      {/* Empty state */}
      {jobs.length === 0 && !isLoading && (
        <div className="card text-center py-12">
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">{t('schedulerUi.noJobs')}</h3>
          <p className="mt-2 text-gray-500">{t('schedulerUi.noJobsHint')}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <svg
            className="animate-spin h-8 w-8 text-gray-400"
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
        </div>
      )}
    </div>
  );
};
