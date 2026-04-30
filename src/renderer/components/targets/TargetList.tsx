import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target } from '../../../shared/types';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';

interface TargetListProps {
  targets: Target[];
  onClear: () => void;
}

export const TargetList: React.FC<TargetListProps> = ({ targets, onClear }) => {
  const { t } = useTranslation();

  const columns = [
    {
      key: 'phoneNumber',
      header: t('common.phone'),
      render: (item: Target) => <span className="font-mono text-sm">{item.phoneNumber}</span>,
    },
    {
      key: 'name',
      header: t('common.name'),
      render: (item: Target) => item.name || <span className="text-gray-400">—</span>,
    },
  ];

  if (targets.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-900">{t('targets.listTitle')}</h3>
          <p className="text-sm text-gray-500">{t('targets.loadedCount', { count: targets.length })}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t('targets.clearAll')}
        </Button>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        <Table
          columns={columns}
          data={targets}
          keyExtractor={(item, i) => `${item.phoneNumber}-${i}`}
          emptyMessage={t('targets.empty')}
        />
      </div>
    </div>
  );
};
