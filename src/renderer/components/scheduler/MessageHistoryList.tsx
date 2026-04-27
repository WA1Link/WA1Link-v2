import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import {
  JobTargetStatus,
  MessageHistoryEntry,
  MessageHistoryFilter,
  ScheduledJob,
} from '../../../shared/types';
import { Button } from '../ui/Button';

const PAGE_SIZE = 50;

type StatusFilter = JobTargetStatus | 'all';

interface MessageHistoryListProps {
  jobs: ScheduledJob[];
}

export const MessageHistoryList: React.FC<MessageHistoryListProps> = ({ jobs }) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<MessageHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [jobId, setJobId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const filter: MessageHistoryFilter = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        status: status === 'all' ? undefined : status,
        jobId: jobId === 'all' ? undefined : jobId,
        search: appliedSearch || undefined,
      };
      const result = await window.electronAPI.scheduler.getMessageHistory(filter);
      setEntries(result.entries);
      setTotal(result.total);
    } finally {
      setIsLoading(false);
    }
  }, [page, status, jobId, appliedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setPage(0);
  }, [status, jobId, appliedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
  };

  const handleExport = async () => {
    // Pull everything that matches current filters (cap at 10k rows for sanity)
    const filter: MessageHistoryFilter = {
      limit: 500,
      offset: 0,
      status: status === 'all' ? undefined : status,
      jobId: jobId === 'all' ? undefined : jobId,
      search: appliedSearch || undefined,
    };

    const all: MessageHistoryEntry[] = [];
    let offset = 0;
    while (offset < 10000) {
      const result = await window.electronAPI.scheduler.getMessageHistory({
        ...filter,
        offset,
      });
      all.push(...result.entries);
      if (result.entries.length < 500 || all.length >= result.total) break;
      offset += 500;
    }

    const rows = all.map((e, i) => ({
      '#': i + 1,
      Name: e.name ?? '',
      Phone: e.phoneNumber,
      Campaign: e.jobName,
      Template: e.templateName ?? '',
      Status: e.status,
      'Sent At': e.sentAt ? moment(e.sentAt).format('YYYY-MM-DD HH:mm:ss') : '',
      Error: e.errorMessage ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'History');
    XLSX.writeFile(wb, `message-history-${moment().format('YYYYMMDD-HHmmss')}.xlsx`);
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const statusBadge = (s: JobTargetStatus) => {
    if (s === 'sent') return <span className="badge-success">{t('schedulerUi.job.statusCompleted')}</span>;
    if (s === 'failed') return <span className="badge-error">{t('schedulerUi.job.statusFailed')}</span>;
    return <span className="badge bg-gray-100 text-gray-600">{t('schedulerUi.job.statusPending')}</span>;
  };

  return (
    <div className="card">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">{t('common.status')}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="border rounded px-3 py-1.5 text-sm w-32"
          >
            <option value="all">{t('common.all')}</option>
            <option value="sent">{t('schedulerUi.job.statusCompleted')}</option>
            <option value="failed">{t('schedulerUi.job.statusFailed')}</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">{t('schedulerUi.history.campaign')}</label>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm w-64"
          >
            <option value="all">{t('common.all')}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('schedulerUi.history.searchPlaceholder')}</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('schedulerUi.history.searchPlaceholder')}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            {t('common.search')}
          </Button>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {t('schedulerUi.history.entries', { count: total })}
          </span>
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={total === 0}>
            {t('schedulerUi.history.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading && entries.length === 0 ? (
        <div className="py-12 text-center text-gray-500">{t('schedulerUi.history.loading')}</div>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          {t('schedulerUi.history.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500 border-b">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">{t('common.name')}</th>
                <th className="py-2 pr-4">{t('common.phone')}</th>
                <th className="py-2 pr-4">{t('schedulerUi.history.campaign')}</th>
                <th className="py-2 pr-4">{t('schedulerUi.history.template')}</th>
                <th className="py-2 pr-4">{t('common.status')}</th>
                <th className="py-2 pr-4">{t('schedulerUi.history.sentAt')}</th>
                <th className="py-2 pr-4">{t('schedulerUi.history.error')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.targetId} className="border-b last:border-b-0">
                  <td className="py-2 pr-4 text-gray-500">
                    {page * PAGE_SIZE + i + 1}
                  </td>
                  <td className="py-2 pr-4">{e.name || '—'}</td>
                  <td className="py-2 pr-4 font-mono">{e.phoneNumber}</td>
                  <td className="py-2 pr-4">{e.jobName}</td>
                  <td className="py-2 pr-4">{e.templateName || '—'}</td>
                  <td className="py-2 pr-4">{statusBadge(e.status)}</td>
                  <td className="py-2 pr-4 text-gray-600">
                    {e.sentAt ? moment(e.sentAt).format('YYYY-MM-DD HH:mm:ss') : '—'}
                  </td>
                  <td className="py-2 pr-4 text-red-600 max-w-xs truncate" title={e.errorMessage}>
                    {e.errorMessage || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            {t('schedulerUi.history.page', { page: page + 1, total: pageCount })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
            >
              {t('common.previous')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1 || isLoading}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
