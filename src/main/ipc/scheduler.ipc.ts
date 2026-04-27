import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { schedulerService } from '../services/scheduler/scheduler.service';
import { scheduleRepository } from '../database/repositories/schedule.repository';
import {
  CreateJobInput,
  ScheduledJob,
  MessageHistoryFilter,
  MessageHistoryResult,
} from '../../shared/types';

let listenersRegistered = false;

export function registerSchedulerIPC(mainWindow: BrowserWindow): void {
  const channels = IPC_CHANNELS.SCHEDULER;

  // Create job
  ipcMain.handle(
    channels.CREATE_JOB,
    async (_, input: CreateJobInput): Promise<ScheduledJob> => {
      return schedulerService.createJob(input);
    }
  );

  // Get all jobs
  ipcMain.handle(channels.GET_ALL_JOBS, async (): Promise<ScheduledJob[]> => {
    return schedulerService.getAllJobs();
  });

  // Cancel job
  ipcMain.handle(channels.CANCEL_JOB, async (_, jobId: string): Promise<void> => {
    schedulerService.cancelJob(jobId);
  });

  // Delete job
  ipcMain.handle(channels.DELETE_JOB, async (_, jobId: string): Promise<void> => {
    schedulerService.deleteJob(jobId);
  });

  // Message history
  ipcMain.handle(
    channels.GET_MESSAGE_HISTORY,
    async (_, filter: MessageHistoryFilter = {}): Promise<MessageHistoryResult> => {
      return scheduleRepository.getMessageHistory(filter);
    }
  );

  // Set up event forwarding (only once per process to avoid stacking)
  if (listenersRegistered) return;
  listenersRegistered = true;

  schedulerService.on('job-progress', (progress) => {
    mainWindow.webContents.send(channels.JOB_PROGRESS, progress);
  });
}
