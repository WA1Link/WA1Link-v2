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

    // Recover orphaned 'running' jobs left over from a prior process that
    // exited mid-send (crash, force-quit, OS shutdown). Without this, those
    // rows would sit in 'running' forever and never be picked up by the
    // scheduler again.
    this.recoverInterruptedJobs();

    // Initial check
    this.checkDueJobs();

    // Set up interval
    this.checkInterval = setInterval(() => {
      this.checkDueJobs();
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Mark any 'running' jobs from a previous process as 'failed'. This must
   * only run at startup, before checkDueJobs and before runningJobId is set.
   */
  private recoverInterruptedJobs(): void {
    try {
      const allJobs = scheduleRepository.getAllJobs();
      for (const job of allJobs) {
        if (job.status === 'running') {
          scheduleRepository.updateJobStatus(job.id, 'failed', {
            completedAt: new Date().toISOString(),
            errorMessage: 'Interrupted by application shutdown',
          });
        }
      }
    } catch (err) {
      console.error('[SchedulerService] Failed to recover interrupted jobs:', err);
    }
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

    let onProgress: ((p: { sent: number; failed: number }) => void) | null = null;
    let onTargetResult: ((r: any) => void) | null = null;
    let onComplete: ((r: { sent: number; failed: number }) => void) | null = null;
    let onError: ((e: { message: string }) => void) | null = null;
    let completed = false;

    const detachListeners = () => {
      if (onProgress) messageService.off('progress', onProgress);
      if (onTargetResult) messageService.off('target-result', onTargetResult);
      if (onComplete) messageService.off('complete', onComplete);
      if (onError) messageService.off('error', onError);
    };

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
        id: t.id,
        phoneNumber: t.phoneNumber,
        name: t.name,
        customFields: t.customFields,
      }));

      // Set up listeners
      onProgress = (progress: { sent: number; failed: number }) => {
        scheduleRepository.updateJobCounts(job.id, progress.sent, progress.failed);
        this.emitProgress(job.id, 'running', job.totalCount, progress.sent, progress.failed);
      };

      onTargetResult = (result: {
        targetId: string;
        templateId?: string;
        status: 'sent' | 'failed';
        sentAt: string;
        errorMessage?: string;
      }) => {
        scheduleRepository.recordTargetResult(result.targetId, result.status, {
          sentAt: result.sentAt,
          templateId: result.templateId,
          errorMessage: result.errorMessage,
        });
      };

      // Don't overwrite a terminal status (cancelled/failed) that another
      // caller (e.g. cancelJob) has already written to the DB.
      const isTerminallySet = (): boolean => {
        const fresh = scheduleRepository.getJobById(job.id);
        return fresh?.status === 'cancelled' || fresh?.status === 'failed';
      };

      onComplete = (result: { sent: number; failed: number }) => {
        completed = true;
        // Always persist the final counts so the user sees what actually went out.
        scheduleRepository.updateJobCounts(job.id, result.sent, result.failed);
        if (isTerminallySet()) {
          // Job was cancelled or failed externally; emit progress with the
          // final counts but leave the existing terminal status alone.
          const fresh = scheduleRepository.getJobById(job.id);
          this.emitProgress(
            job.id,
            (fresh?.status as JobProgress['status']) ?? 'completed',
            job.totalCount,
            result.sent,
            result.failed
          );
          return;
        }
        scheduleRepository.updateJobStatus(job.id, 'completed', {
          completedAt: new Date().toISOString(),
        });
        this.emitProgress(job.id, 'completed', job.totalCount, result.sent, result.failed);
      };

      onError = (e: { message: string }) => {
        // Capture errors emitted before sendBulk's promise resolves so the job
        // doesn't sit indefinitely in "running" state.
        if (!completed) {
          completed = true;
          if (isTerminallySet()) return;
          scheduleRepository.updateJobStatus(job.id, 'failed', {
            completedAt: new Date().toISOString(),
            errorMessage: e.message,
          });
          this.emitProgress(
            job.id,
            'failed',
            job.totalCount,
            job.sentCount,
            job.failedCount,
            e.message
          );
        }
      };

      messageService.on('progress', onProgress);
      messageService.on('target-result', onTargetResult);
      messageService.on('complete', onComplete);
      messageService.on('error', onError);

      // Create bulk send request
      const request: BulkSendRequest = {
        accountId: job.accountId,
        templateIds: job.templateIds,
        targets,
        delayConfig: job.delayConfig,
      };

      // Start sending
      await messageService.sendBulk(request);

      // If sendBulk resolved without ever firing complete/error (e.g. it
      // short-circuited internally), surface that as a failure rather than
      // leaving the job stuck.
      if (!completed) {
        const fresh = scheduleRepository.getJobById(job.id);
        if (fresh?.status !== 'cancelled' && fresh?.status !== 'failed') {
          scheduleRepository.updateJobStatus(job.id, 'failed', {
            completedAt: new Date().toISOString(),
            errorMessage: 'Send finished without completion event',
          });
          this.emitProgress(
            job.id,
            'failed',
            job.totalCount,
            job.sentCount,
            job.failedCount,
            'Send finished without completion event'
          );
        }
      }
    } catch (error) {
      const fresh = scheduleRepository.getJobById(job.id);
      if (fresh?.status !== 'cancelled' && fresh?.status !== 'failed') {
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
      }
    } finally {
      detachListeners();
      this.runningJobId = null;
    }
  }

  /**
   * Wait for socket connection
   */
  private waitForConnection(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (socketService.isConnected()) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Connection timeout'));
      }, timeoutMs);
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

  /**
   * Run a direct (non-scheduled) bulk send. Creates a synthetic job row in
   * scheduled_jobs / job_targets so the existing per-target persistence and
   * history page coverage applies to direct sends too.
   */
  async runDirectSend(request: BulkSendRequest): Promise<ScheduledJob> {
    if (this.runningJobId) {
      throw new Error('Another bulk send is already running. Wait for it to finish first.');
    }

    const job = scheduleRepository.createJob({
      name: `Direct send – ${new Date().toLocaleString()}`,
      accountId: request.accountId,
      templateIds: request.templateIds,
      scheduledAt: new Date().toISOString(),
      delayConfig: request.delayConfig,
      targets: request.targets,
    });

    await this.runJob(job);
    return scheduleRepository.getJobById(job.id) ?? job;
  }

  /**
   * Cancel whatever job is currently running (scheduled or direct). No-op
   * if nothing is running. Wired up to the renderer's "Stop sending" button.
   */
  cancelCurrentJob(): void {
    if (this.runningJobId) {
      this.cancelJob(this.runningJobId);
    }
  }
}

export const schedulerService = new SchedulerService();
