import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index';
import {
  ScheduledJob,
  JobTarget,
  CreateJobInput,
  JobStatus,
  JobTargetStatus,
  DelayConfig,
  MessageHistoryEntry,
  MessageHistoryFilter,
  MessageHistoryResult,
} from '../../../shared/types';

interface JobRow {
  id: string;
  name: string;
  account_id: string;
  template_ids: string;
  scheduled_at: string;
  status: JobStatus;
  delay_config: string;
  total_count: number;
  sent_count: number;
  failed_count: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface TargetRow {
  id: string;
  job_id: string;
  phone_number: string;
  name: string | null;
  custom_fields: string | null;
  status: JobTargetStatus;
  sent_at: string | null;
  error_message: string | null;
  template_id: string | null;
}

interface HistoryRow extends TargetRow {
  job_name: string;
  account_id: string;
  template_name: string | null;
}

function rowToJob(row: JobRow): ScheduledJob {
  return {
    id: row.id,
    name: row.name,
    accountId: row.account_id,
    templateIds: JSON.parse(row.template_ids),
    scheduledAt: row.scheduled_at,
    status: row.status,
    delayConfig: JSON.parse(row.delay_config) as DelayConfig,
    totalCount: row.total_count,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
  };
}

function rowToTarget(row: TargetRow): JobTarget {
  return {
    id: row.id,
    jobId: row.job_id,
    phoneNumber: row.phone_number,
    name: row.name ?? undefined,
    customFields: row.custom_fields ? JSON.parse(row.custom_fields) : {},
    status: row.status,
    sentAt: row.sent_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
    templateId: row.template_id ?? undefined,
  };
}

function rowToHistoryEntry(row: HistoryRow): MessageHistoryEntry {
  return {
    targetId: row.id,
    jobId: row.job_id,
    jobName: row.job_name,
    accountId: row.account_id,
    phoneNumber: row.phone_number,
    name: row.name ?? undefined,
    status: row.status,
    sentAt: row.sent_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
    templateId: row.template_id ?? undefined,
    templateName: row.template_name ?? undefined,
  };
}

export class ScheduleRepository {
  createJob(input: CreateJobInput): ScheduledJob {
    const db = getDatabase();
    const jobId = uuidv4();

    db.prepare(`
      INSERT INTO scheduled_jobs (
        id, name, account_id, template_ids, scheduled_at, delay_config, total_count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      input.name,
      input.accountId,
      JSON.stringify(input.templateIds),
      input.scheduledAt,
      JSON.stringify(input.delayConfig),
      input.targets.length
    );

    // Insert targets
    const insertTarget = db.prepare(`
      INSERT INTO job_targets (id, job_id, phone_number, name, custom_fields)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction(() => {
      for (const target of input.targets) {
        insertTarget.run(
          uuidv4(),
          jobId,
          target.phoneNumber,
          target.name ?? null,
          JSON.stringify(target.customFields)
        );
      }
    });

    insertMany();

    return this.getJobById(jobId)!;
  }

  getJobById(id: string): ScheduledJob | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM scheduled_jobs WHERE id = ?').get(id) as JobRow | undefined;
    return row ? rowToJob(row) : null;
  }

  getAllJobs(): ScheduledJob[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM scheduled_jobs ORDER BY created_at DESC').all() as JobRow[];
    return rows.map(rowToJob);
  }

  getPendingJobs(): ScheduledJob[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM scheduled_jobs WHERE status = ? ORDER BY scheduled_at ASC'
    ).all('pending') as JobRow[];
    return rows.map(rowToJob);
  }

  getDueJobs(now: Date = new Date()): ScheduledJob[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM scheduled_jobs
      WHERE status = 'pending' AND scheduled_at <= ?
      ORDER BY scheduled_at ASC
    `).all(now.toISOString()) as JobRow[];
    return rows.map(rowToJob);
  }

  getJobTargets(jobId: string): JobTarget[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM job_targets WHERE job_id = ? ORDER BY id'
    ).all(jobId) as TargetRow[];
    return rows.map(rowToTarget);
  }

  getPendingTargets(jobId: string): JobTarget[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM job_targets WHERE job_id = ? AND status = ? ORDER BY id'
    ).all(jobId, 'pending') as TargetRow[];
    return rows.map(rowToTarget);
  }

  updateJobStatus(
    id: string,
    status: JobStatus,
    additional?: { errorMessage?: string; startedAt?: string; completedAt?: string }
  ): ScheduledJob | null {
    const db = getDatabase();
    const updates: string[] = ['status = ?'];
    const values: unknown[] = [status];

    if (additional?.errorMessage !== undefined) {
      updates.push('error_message = ?');
      values.push(additional.errorMessage);
    }

    if (additional?.startedAt !== undefined) {
      updates.push('started_at = ?');
      values.push(additional.startedAt);
    }

    if (additional?.completedAt !== undefined) {
      updates.push('completed_at = ?');
      values.push(additional.completedAt);
    }

    values.push(id);

    db.prepare(`
      UPDATE scheduled_jobs
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    return this.getJobById(id);
  }

  updateJobCounts(id: string, sentCount: number, failedCount: number): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE scheduled_jobs
      SET sent_count = ?, failed_count = ?
      WHERE id = ?
    `).run(sentCount, failedCount, id);
  }

  updateTargetStatus(targetId: string, status: JobTargetStatus): void {
    const db = getDatabase();
    db.prepare('UPDATE job_targets SET status = ? WHERE id = ?').run(status, targetId);
  }

  recordTargetResult(
    targetId: string,
    status: JobTargetStatus,
    options: { sentAt: string; templateId?: string; errorMessage?: string }
  ): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE job_targets
      SET status = ?, sent_at = ?, template_id = ?, error_message = ?
      WHERE id = ?
    `).run(
      status,
      options.sentAt,
      options.templateId ?? null,
      options.errorMessage ?? null,
      targetId
    );
  }

  getMessageHistory(filter: MessageHistoryFilter = {}): MessageHistoryResult {
    const db = getDatabase();
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
    const offset = Math.max(filter.offset ?? 0, 0);

    const where: string[] = ['jt.status != ?'];
    const params: unknown[] = ['pending'];

    if (filter.status && filter.status !== 'all') {
      where.push('jt.status = ?');
      params.push(filter.status);
    }

    if (filter.jobId) {
      where.push('jt.job_id = ?');
      params.push(filter.jobId);
    }

    if (filter.search) {
      where.push('(jt.phone_number LIKE ? OR jt.name LIKE ?)');
      const like = `%${filter.search}%`;
      params.push(like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = db
      .prepare(
        `SELECT COUNT(*) as c FROM job_targets jt ${whereSql}`
      )
      .get(...params) as { c: number };

    const rows = db
      .prepare(
        `
        SELECT
          jt.*,
          sj.name        AS job_name,
          sj.account_id  AS account_id,
          mt.name        AS template_name
        FROM job_targets jt
        JOIN scheduled_jobs sj ON sj.id = jt.job_id
        LEFT JOIN message_templates mt ON mt.id = jt.template_id
        ${whereSql}
        ORDER BY jt.sent_at DESC, jt.id DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, limit, offset) as HistoryRow[];

    return {
      total: countRow.c,
      entries: rows.map(rowToHistoryEntry),
    };
  }

  deleteJob(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM scheduled_jobs WHERE id = ?').run(id);
    return result.changes > 0;
  }

  cancelJob(id: string): ScheduledJob | null {
    return this.updateJobStatus(id, 'cancelled');
  }
}

export const scheduleRepository = new ScheduleRepository();
