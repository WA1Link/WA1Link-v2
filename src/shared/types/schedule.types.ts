import { DelayConfig, Target } from './message.types';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type JobTargetStatus = 'pending' | 'sent' | 'failed';

export interface ScheduledJob {
  id: string;
  name: string;
  accountId: string;
  templateIds: string[];
  scheduledAt: string;
  status: JobStatus;
  delayConfig: DelayConfig;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface JobTarget {
  id: string;
  jobId: string;
  phoneNumber: string;
  name?: string;
  customFields: Record<string, string>;
  status: JobTargetStatus;
}

export interface CreateJobInput {
  name: string;
  accountId: string;
  templateIds: string[];
  scheduledAt: string;
  targets: Target[];
  delayConfig: DelayConfig;
}

export interface JobProgress {
  jobId: string;
  status: JobStatus;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  currentTarget?: string;
}
