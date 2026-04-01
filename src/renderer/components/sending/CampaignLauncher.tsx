import React from 'react';
import { Button } from '../ui/Button';
import { MessageTemplate, Target, DelayConfig } from '../../../shared/types';

interface CampaignLauncherProps {
  selectedTemplates: MessageTemplate[];
  targets: Target[];
  delayConfig: DelayConfig;
  isConnected: boolean;
  isSending: boolean;
  onOpenDelaySettings: () => void;
  onStartSending: () => void;
}

export const CampaignLauncher: React.FC<CampaignLauncherProps> = ({
  selectedTemplates,
  targets,
  delayConfig,
  isConnected,
  isSending,
  onOpenDelaySettings,
  onStartSending,
}) => {
  const canStart = selectedTemplates.length > 0 && targets.length > 0 && isConnected && !isSending;

  const estimatedTime = () => {
    if (targets.length === 0) return '—';

    const avgDelay = (delayConfig.perMessageMin + delayConfig.perMessageMax) / 2;
    const batchDelay = (delayConfig.batchDelayMin + delayConfig.batchDelayMax) / 2;
    const numBatches = Math.floor(targets.length / delayConfig.batchSize);

    const totalMs = targets.length * avgDelay + numBatches * batchDelay;
    const minutes = Math.ceil(totalMs / 60000);

    if (minutes < 60) return `~${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `~${hours}h ${remainingMins}m`;
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-4">Launch Campaign</h3>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900">{selectedTemplates.length}</p>
          <p className="text-xs text-gray-500">Templates</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900">{targets.length}</p>
          <p className="text-xs text-gray-500">Recipients</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900">{estimatedTime()}</p>
          <p className="text-xs text-gray-500">Est. Duration</p>
        </div>
      </div>

      {/* Warnings */}
      <div className="space-y-2 mb-6">
        {!isConnected && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>Please connect a WhatsApp account first</span>
          </div>
        )}

        {selectedTemplates.length === 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>Select at least one message template</span>
          </div>
        )}

        {targets.length === 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>Upload an Excel file with target phone numbers</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={onStartSending}
          disabled={!canStart}
          isLoading={isSending}
          className="flex-1"
          leftIcon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          }
        >
          Start Sending
        </Button>

        <Button variant="secondary" onClick={onOpenDelaySettings}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Button>
      </div>
    </div>
  );
};
