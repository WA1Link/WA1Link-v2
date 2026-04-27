import React from 'react';
import { useTranslation } from 'react-i18next';
import { SchedulerDashboard } from '../components/scheduler/SchedulerDashboard';

export const SchedulerPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('pages.scheduler.title')}</h1>
        <p className="text-gray-500 mt-1">{t('pages.scheduler.description')}</p>
      </div>

      <SchedulerDashboard />
    </div>
  );
};
