import React from 'react';
import { Target } from '../../../shared/types';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';

interface TargetListProps {
  targets: Target[];
  onClear: () => void;
}

export const TargetList: React.FC<TargetListProps> = ({ targets, onClear }) => {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'sent':
        return <span className="badge-success">Sent</span>;
      case 'failed':
        return <span className="badge-error">Failed</span>;
      default:
        return <span className="badge bg-gray-100 text-gray-600">Pending</span>;
    }
  };

  const columns = [
    {
      key: 'phoneNumber',
      header: 'Phone Number',
      render: (item: Target) => <span className="font-mono text-sm">{item.phoneNumber}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      render: (item: Target) => item.name || <span className="text-gray-400">—</span>,
    },
    {
      key: 'customFields',
      header: 'Custom Fields',
      render: (item: Target) => {
        const fields = Object.entries(item.customFields);
        if (fields.length === 0) return <span className="text-gray-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {fields.slice(0, 2).map(([key, value]) => (
              <span
                key={key}
                className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                title={`${key}: ${value}`}
              >
                {key}: {value.slice(0, 15)}
                {value.length > 15 ? '...' : ''}
              </span>
            ))}
            {fields.length > 2 && (
              <span className="text-xs text-gray-400">+{fields.length - 2}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Target) => getStatusBadge(item.status),
      className: 'w-24',
    },
  ];

  if (targets.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-900">Target List</h3>
          <p className="text-sm text-gray-500">{targets.length} contacts loaded</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear All
        </Button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        <Table
          columns={columns}
          data={targets}
          keyExtractor={(item, i) => `${item.phoneNumber}-${i}`}
          emptyMessage="No targets loaded"
        />
      </div>
    </div>
  );
};
