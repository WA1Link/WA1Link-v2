import React from 'react';
import { useTranslation } from 'react-i18next';
import { CRMDashboardStats, CUSTOMER_STATUSES, CUSTOMER_STATUS_COLORS } from '../../../shared/types';

interface CRMDashboardProps {
  stats: CRMDashboardStats | null;
}

export const CRMDashboard: React.FC<CRMDashboardProps> = ({ stats }) => {
  const { t } = useTranslation();
  if (!stats) return null;

  const cards = [
    {
      label: t('crm.dashboard.totalCustomers'),
      value: stats.totalCustomers,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: t('crm.dashboard.activeCustomers'),
      value: stats.activeCustomers,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-green-600 bg-green-50',
    },
    {
      label: t('crm.dashboard.totalRevenue'),
      value: `${stats.totalRevenue.toFixed(2)}`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: t('crm.dashboard.totalPayments'),
      value: stats.totalPayments,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-orange-600 bg-orange-50',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.color}`}>{card.icon}</div>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-lg font-semibold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">{t('crm.dashboard.statusDistribution')}</h3>
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_STATUSES.map((status) => (
            <span
              key={status}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${CUSTOMER_STATUS_COLORS[status]}`}
            >
              {t(`crm.customerStatus.${status}` as any)}
              <span className="font-bold">{stats.statusCounts[status] ?? 0}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
