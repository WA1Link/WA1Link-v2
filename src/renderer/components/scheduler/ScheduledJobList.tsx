import React from 'react';
import moment from 'moment';
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
  const getStatusBadge = (status: ScheduledJob['status']) => {
    switch (status) {
      case 'pending':
        return <span className="badge-warning">Pending</span>;
      case 'running':
        return <span className="badge-info">Running</span>;
      case 'completed':
        return <span className="badge-success">Completed</span>;
      case 'failed':
        return <span className="badge-error">Failed</span>;
      case 'cancelled':
        return <span className="badge bg-gray-100 text-gray-600">Cancelled</span>;
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
        <p className="mt-2">No scheduled jobs</p>
        <p className="text-sm">Schedule a campaign to get started</p>
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
                Scheduled for {moment(job.scheduledAt).format('MMM D, YYYY h:mm A')}
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
                  {job.sentCount} sent, {job.failedCount} failed
                </span>
                <span>{job.totalCount} total</span>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">Templates:</span>
              <span className="ml-2 font-medium">{job.templateIds.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Recipients:</span>
              <span className="ml-2 font-medium">{job.totalCount}</span>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>
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
                Cancel
              </Button>
            )}
            {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
              <Button variant="ghost" size="sm" onClick={() => onDelete(job.id)}>
                Delete
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
