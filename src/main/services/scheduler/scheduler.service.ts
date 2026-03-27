import { EventEmitter } from 'events';
import { scheduleRepository } from '../../database/repositories/schedule.repository';
import { messageRepository } from '../../database/repositories/message.repository';
import { accountRepository } from '../../database/repositories/account.repository';
import { socketService } from '../whatsapp/socket.service';
import { messageService } from '../whatsapp/message.service';
import {
  ScheduledJob,
  JobProgress,
  CreateJobInput,
  BulkSendRequest,
  Target,
} from '../../../shared/types';

const CHECK_INTERVAL_MS = 60_000; // Check every minute

export class SchedulerService extends EventEmitter {
  private checkInterval: NodeJS.Timeout | null = null;
  private runningJobId: string | null = null;

  constructor() {
    super();
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.checkInterval) return;

    // Initial check
    this.checkDueJobs();

    // Set up interval
    this.checkInterval = setInterval(() => {
      this.checkDueJobs();
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check for due jobs and run them
   */
  private async checkDueJobs(): Promise<void> {
    // Don't start new job if one is running
    if (this.runningJobId) return;

    const dueJobs = scheduleRepository.getDueJobs();
    if (dueJobs.length === 0) return;

    // Run the first due job
    await this.runJob(dueJobs[0]);
  }

  /**
   * Create a new scheduled job
   */
  createJob(input: CreateJobInput): ScheduledJob {
    return scheduleRepository.createJob(input);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ScheduledJob[] {
    return scheduleRepository.getAllJobs();
  }

  /**
   * Cancel a pending job
   */
  cancelJob(jobId: string): ScheduledJob | null {
    const job = scheduleRepository.getJobById(jobId);
    if (!job) return null;

    // Only cancel if pending or running
    if (job.status !== 'pending' && job.status !== 'running') {
      return job;
    }

    // If currently running, stop sending
    if (this.runningJobId === jobId) {
      messageService.stopSending();
      this.runningJobId = null;
    }

    return scheduleRepository.cancelJob(jobId);
  }

  /**
   * Delete a job
   */
  deleteJob(jobId: string): boolean {
    // Cancel if running
    if (this.runningJobId === jobId) {
      messageService.stopSending();
      this.runningJobId = null;
    }

    return scheduleRepository.deleteJob(jobId);
  }

  /**
   * Run a scheduled job
   */
  private async runJob(job: ScheduledJob): Promise<void> {
    this.runningJobId = job.id;

    // Update job status to running
    scheduleRepository.updateJobStatus(job.id, 'running', {
      startedAt: new Date().toISOString(),
    });

    this.emitProgress(job.id, 'running', job.totalCount, 0, 0);

    try {
      // Get account
      const account = accountRepository.getById(job.accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Check if connected
      if (!socketService.isConnected() || socketService.getActiveAccountId() !== job.accountId) {
        // Try to connect
        await socketService.connect(account);
        // Wait for connection
        await this.waitForConnection(5000);
      }

      if (!socketService.isConnected()) {
        throw new Error('Failed to connect to WhatsApp');
      }

      // Get targets
      const jobTargets = scheduleRepository.getJobTargets(job.id);
      const targets: Target[] = jobTargets.map((t) => ({
        phoneNumber: t.phoneNumber,
        name: t.name,
        customFields: t.customFields,
      }));

      // Set up progress listener
      const onProgress = (progress: { sent: number; failed: number }) => {
        scheduleRepository.updateJobCounts(job.id, progress.sent, progress.failed);
        this.emitProgress(job.id, 'running', job.totalCount, progress.sent, progress.failed);
      };

      const onComplete = (result: { sent: number; failed: number }) => {
        scheduleRepository.updateJobStatus(job.id, 'completed', {
          completedAt: new Date().toISOString(),
        });
        scheduleRepository.updateJobCounts(job.id, result.sent, result.failed);
        this.emitProgress(job.id, 'completed', job.totalCount, result.sent, result.failed);
        this.runningJobId = null;

        // Clean up listeners
        messageService.off('progress', onProgress);
        messageService.off('complete', onComplete);
      };

      messageService.on('progress', onProgress);
      messageService.on('complete', onComplete);

      // Create bulk send request
      const request: BulkSendRequest = {
        accountId: job.accountId,
        templateIds: job.templateIds,
        targets,
        delayConfig: job.delayConfig,
      };

      // Start sending
      await messageService.sendBulk(request);
    } catch (error) {
      // Update job as failed
      scheduleRepository.updateJobStatus(job.id, 'failed', {
        completedAt: new Date().toISOString(),
        errorMessage: (error as Error).message,
      });

      this.emitProgress(
        job.id,
        'failed',
        job.totalCount,
        job.sentCount,
        job.failedCount,
        (error as Error).message
      );

      this.runningJobId = null;
    }
  }

  /**
   * Wait for socket connection
   */
  private waitForConnection(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeoutMs);

      const checkInterval = setInterval(() => {
        if (socketService.isConnected()) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
  }

  /**
   * Emit job progress event
   */
  private emitProgress(
    jobId: string,
    status: JobProgress['status'],
    totalCount: number,
    sentCount: number,
    failedCount: number,
    error?: string
  ): void {
    const progress: JobProgress = {
      jobId,
      status,
      totalCount,
      sentCount,
      failedCount,
    };

    this.emit('job-progress', progress);
  }

  /**
   * Get currently running job ID
   */
  getRunningJobId(): string | null {
    return this.runningJobId;
  }
}

export const schedulerService = new SchedulerService();
