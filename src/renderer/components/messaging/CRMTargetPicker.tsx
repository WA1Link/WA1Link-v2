import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { MultiDropdown } from '../ui/MultiDropdown';
import { useCRMStore } from '../../stores/useCRMStore';
import {
  Customer,
  CUSTOMER_STATUSES,
  CustomerFilter,
  DEFAULT_CUSTOMER_PAGE_SIZE,
  Target,
} from '../../../shared/types';

interface CRMTargetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (targets: Target[]) => void;
}

/** Source filter option: encoded as `${type}|${name ?? ''}` for the dropdown. */
function encodeSource(type: string, name: string | null): string {
  return `${type}|${name ?? ''}`;
}
function decodeSource(value: string): { type: string; name: string | null } | null {
  if (!value) return null;
  const idx = value.indexOf('|');
  if (idx === -1) return { type: value, name: null };
  const type = value.slice(0, idx);
  const name = value.slice(idx + 1);
  return { type, name: name === '' ? null : name };
}

export const CRMTargetPicker: React.FC<CRMTargetPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation();
  const {
    customerSources,
    fetchCustomerSources,
    fetchCustomersWithFilter,
    tags,
    fetchTags,
  } = useCRMStore();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusValue, setStatusValue] = useState<string>('');
  const [sourceValue, setSourceValue] = useState<string>('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_CUSTOMER_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  // Persist full customer objects so selections survive filter changes.
  const [selectedMap, setSelectedMap] = useState<Map<string, Customer>>(new Map());

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    setSearchInput('');
    setSearch('');
    setStatusValue('');
    setSourceValue('');
    setTagIds([]);
    setRangeFrom('');
    setRangeTo('');
    setPage(1);
    setSelectedMap(new Map());
    fetchCustomerSources();
    fetchTags();
  }, [isOpen, fetchCustomerSources, fetchTags]);

  // Debounce the search input.
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Reset to page 1 whenever any filter changes — otherwise the user may land
  // on a now-empty page.
  useEffect(() => {
    setPage(1);
  }, [search, statusValue, sourceValue, tagIds, pageSize]);

  // Refetch customers whenever filters or paging change while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);

    const decoded = decodeSource(sourceValue);
    const filter: CustomerFilter = {
      search: search || undefined,
      status: (statusValue || undefined) as CustomerFilter['status'],
      isActive: true,
      sourceType: (decoded?.type || undefined) as CustomerFilter['sourceType'],
      sourceName: decoded?.name ?? undefined,
      tagIds: tagIds.length > 0 ? tagIds : undefined,
    };

    fetchCustomersWithFilter(filter, { page, pageSize })
      .then((result) => {
        if (!cancelled) {
          setCustomers(result.items);
          setTotal(result.total);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, search, statusValue, sourceValue, tagIds, page, pageSize, fetchCustomersWithFilter]);

  const statusOptions = useMemo(
    () => [
      { value: '', label: t('common.all') },
      ...CUSTOMER_STATUSES.map((s) => ({ value: s, label: t(`crm.customerStatus.${s}` as any) })),
    ],
    [t]
  );

  const sourceOptions = useMemo(() => {
    const opts = [{ value: '', label: t('common.all') }];
    for (const src of customerSources) {
      const label =
        src.sourceType === 'group' && src.sourceName
          ? `${t('crm.customerSourceType.group')}: ${src.sourceName} (${src.count})`
          : `${t(`crm.customerSourceType.${src.sourceType}` as any)} (${src.count})`;
      opts.push({ value: encodeSource(src.sourceType, src.sourceName), label });
    }
    return opts;
  }, [customerSources, t]);

  const tagOptions = useMemo(
    () => tags.map((tag) => ({ value: tag.id, label: tag.name })),
    [tags]
  );

  const toggleOne = (c: Customer) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(c.id)) next.delete(c.id);
      else next.set(c.id, c);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      const allOn = customers.every((c) => next.has(c.id));
      if (allOn) {
        for (const c of customers) next.delete(c.id);
      } else {
        for (const c of customers) next.set(c.id, c);
      }
      return next;
    });
  };

  /** R3 — select rows [from, to] (1-indexed, inclusive) of the *full* filtered
   *  list, not just the visible page. Resets any prior selection first so the
   *  range is the *only* selection. */
  const applyRange = async () => {
    const fromN = parseInt(rangeFrom, 10);
    const toN = parseInt(rangeTo, 10);
    if (!Number.isFinite(fromN) || !Number.isFinite(toN) || fromN < 1 || toN < fromN) {
      return;
    }

    const decoded = decodeSource(sourceValue);
    const filter: CustomerFilter = {
      search: search || undefined,
      status: (statusValue || undefined) as CustomerFilter['status'],
      isActive: true,
      sourceType: (decoded?.type || undefined) as CustomerFilter['sourceType'],
      sourceName: decoded?.name ?? undefined,
      tagIds: tagIds.length > 0 ? tagIds : undefined,
    };

    const offset = fromN - 1;
    const limit = toN - fromN + 1;
    setIsLoading(true);
    try {
      const slice = await window.electronAPI.customer.getSlice(filter, offset, limit);
      const next = new Map<string, Customer>();
      for (const c of slice) next.set(c.id, c);
      setSelectedMap(next);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSelection = () => setSelectedMap(new Map());

  const handleConfirm = () => {
    const targets: Target[] = Array.from(selectedMap.values()).map((c) => ({
      phoneNumber: c.phoneNumber,
      name: c.fullName,
      customFields: {
        status: c.status,
        sourceType: c.sourceType,
        sourceName: c.sourceName ?? '',
      },
      status: 'pending',
    }));
    onSelect(targets);
    onClose();
  };

  const allVisibleSelected =
    customers.length > 0 && customers.every((c) => selectedMap.has(c.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('crmPicker.title')} size="4xl">
      <div className="space-y-3">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder={t('crm.customers.search')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Dropdown
            options={statusOptions}
            value={statusValue}
            onChange={setStatusValue}
            placeholder={t('common.status')}
          />
          <Dropdown
            options={sourceOptions}
            value={sourceValue}
            onChange={setSourceValue}
            placeholder={t('crmPicker.sourcePlaceholder')}
          />
          <MultiDropdown
            options={tagOptions}
            values={tagIds}
            onChange={setTagIds}
            placeholder={t('tags.title')}
          />
        </div>

        {/* Range (R3) — left-aligned, vertically centered; total in view on the right */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mr-2">
            {t('crmPicker.rangeLabel')}
          </div>
          <div className="w-24">
            <Input
              type="number"
              min={1}
              placeholder={t('crmPicker.from')}
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
            />
          </div>
          <div className="w-24">
            <Input
              type="number"
              min={1}
              placeholder={t('crmPicker.to')}
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
            />
          </div>
          <Button size="sm" variant="secondary" onClick={applyRange}>
            {t('crmPicker.applyRange')}
          </Button>
          <span className="ml-auto text-xs text-gray-500">
            {t('crmPicker.totalInView', {
              count: customers.length,
              defaultValue: `${customers.length} in view`,
            })}{' '}
            / {total} total
          </span>
        </div>

        {/* Page nav */}
        <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
          <span className="text-xs text-gray-500 mr-auto">
            {total === 0
              ? '0 / 0'
              : `${(page - 1) * pageSize + 1}–${Math.min(total, page * pageSize)} / ${total}`}
          </span>
          <span className="text-xs text-gray-500">
            {t('crm.customers.pageSize', { defaultValue: 'Page size' })}
          </span>
          <div className="w-24">
            <Dropdown
              options={[
                { value: '50', label: '50' },
                { value: '100', label: '100' },
                { value: '200', label: '200' },
                { value: '500', label: '500' },
              ]}
              value={String(pageSize)}
              onChange={(v) => setPageSize(parseInt(v, 10) || 100)}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
          >
            ‹ {t('common.prev', { defaultValue: 'Prev' })}
          </Button>
          <span className="px-2 font-medium">
            {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setPage((p) => Math.min(Math.max(1, Math.ceil(total / pageSize)), p + 1))
            }
            disabled={page >= Math.max(1, Math.ceil(total / pageSize)) || isLoading}
          >
            {t('common.next', { defaultValue: 'Next' })} ›
          </Button>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[45vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="Select all visible"
                    />
                  </th>
                  <th className="w-12 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('crm.customers.name')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('crm.customers.phone')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('common.status')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('crm.customers.source')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">
                      {t('crm.customers.noCustomers')}
                    </td>
                  </tr>
                ) : (
                  customers.map((c, i) => {
                    const checked = selectedMap.has(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-gray-50 cursor-pointer ${checked ? 'bg-whatsapp-light bg-opacity-10' : ''}`}
                        onClick={() => toggleOne(c)}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(c)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-500 font-mono">
                          {(page - 1) * pageSize + i + 1}
                        </td>
                        <td className="px-3 py-2 text-sm">{c.fullName}</td>
                        <td className="px-3 py-2 text-sm font-mono">{c.phoneNumber}</td>
                        <td className="px-3 py-2 text-xs">
                          {t(`crm.customerStatus.${c.status}` as any)}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {c.sourceType === 'group' && c.sourceName
                            ? `${t('crm.customerSourceType.group')}: ${c.sourceName}`
                            : t(`crm.customerSourceType.${c.sourceType}` as any)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ModalFooter>
        <span className="mr-auto text-sm text-gray-600">
          {t('crmPicker.selectedCount', { count: selectedMap.size })}
        </span>
        <Button variant="ghost" onClick={clearSelection} disabled={selectedMap.size === 0}>
          {t('crmPicker.clearSelection')}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleConfirm} disabled={selectedMap.size === 0}>
          {t('crmPicker.useSelected')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
