import React from 'react';
import { SchedulerDashboard } from '../components/scheduler/SchedulerDashboard';

export const SchedulerPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scheduled Campaigns</h1>
        <p className="text-gray-500 mt-1">
          View and manage your scheduled messaging campaigns
        </p>
      </div>

      <SchedulerDashboard />
    </div>
  );
};
