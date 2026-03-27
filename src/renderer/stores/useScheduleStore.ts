import { create } from 'zustand';
import { ScheduledJob, JobProgress, CreateJobInput } from '../../shared/types';

interface ScheduleState {
  jobs: ScheduledJob[];
  isLoading: boolean;
  error: string | null;
}

interface ScheduleActions {
  // CRUD
  fetchJobs: () => Promise<void>;
  createJob: (input: CreateJobInput) => Promise<ScheduledJob>;
  cancelJob: (jobId: string) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;

  // Progress updates
  updateJobProgress: (progress: JobProgress) => void;

  // Utilities
  getJobById: (jobId: string) => ScheduledJob | undefined;
  getPendingJobs: () => ScheduledJob[];
  getRunningJobs: () => ScheduledJob[];
  getCompletedJobs: () => ScheduledJob[];
  setError: (error: string | null) => void;
}

type ScheduleStore = ScheduleState & ScheduleActions;

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  // Initial state
  jobs: [],
  isLoading: false,
  error: null,

  // Fetch all jobs
  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const jobs = await window.electronAPI.scheduler.getAllJobs();
      set({ jobs, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Create job
  createJob: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const job = await window.electronAPI.scheduler.createJob(input);
      set((state) => ({
        jobs: [job, ...state.jobs],
        isLoading: false,
      }));
      return job;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Cancel job
  cancelJob: async (jobId) => {
    try {
      await window.electronAPI.scheduler.cancelJob(jobId);
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === jobId ? { ...j, status: 'cancelled' as const } : j
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete job
  deleteJob: async (jobId) => {
    try {
      await window.electronAPI.scheduler.deleteJob(jobId);
      set((state) => ({
        jobs: state.jobs.filter((j) => j.id !== jobId),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Update job progress from IPC
  updateJobProgress: (progress) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === progress.jobId
          ? {
              ...j,
              status: progress.status,
              sentCount: progress.sentCount,
              failedCount: progress.failedCount,
            }
          : j
      ),
    }));
  },

  // Get job by ID
  getJobById: (jobId) => {
    return get().jobs.find((j) => j.id === jobId);
  },

  // Get pending jobs
  getPendingJobs: () => {
    return get().jobs.filter((j) => j.status === 'pending');
  },

  // Get running jobs
  getRunningJobs: () => {
    return get().jobs.filter((j) => j.status === 'running');
  },

  // Get completed jobs
  getCompletedJobs: () => {
    return get().jobs.filter((j) => j.status === 'completed');
  },

  // Set error
  setError: (error) => {
    set({ error });
  },
}));
