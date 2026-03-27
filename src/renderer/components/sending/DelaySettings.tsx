import React from 'react';
import { DelayConfig, DEFAULT_DELAY_CONFIG } from '../../../shared/types';
import { Input } from '../ui/Input';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';

interface DelaySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: DelayConfig;
  onChange: (config: DelayConfig) => void;
}

export const DelaySettings: React.FC<DelaySettingsProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
}) => {
  const handleChange = (key: keyof DelayConfig, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange({ ...config, [key]: numValue });
    }
  };

  const handleReset = () => {
    onChange(DEFAULT_DELAY_CONFIG);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delay Settings" size="md">
      <div className="space-y-6">
        {/* Per-message delay */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Message Delay (ms)</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum"
              type="number"
              min={0}
              value={config.perMessageMin}
              onChange={(e) => handleChange('perMessageMin', e.target.value)}
              helperText="Min delay between messages"
            />
            <Input
              label="Maximum"
              type="number"
              min={0}
              value={config.perMessageMax}
              onChange={(e) => handleChange('perMessageMax', e.target.value)}
              helperText="Max delay between messages"
            />
          </div>
        </div>

        {/* Batch settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Batch Settings</h4>
          <div className="space-y-4">
            <Input
              label="Batch Size"
              type="number"
              min={1}
              value={config.batchSize}
              onChange={(e) => handleChange('batchSize', e.target.value)}
              helperText="Number of messages before taking a break"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Batch Delay Min (ms)"
                type="number"
                min={0}
                value={config.batchDelayMin}
                onChange={(e) => handleChange('batchDelayMin', e.target.value)}
              />
              <Input
                label="Batch Delay Max (ms)"
                type="number"
                min={0}
                value={config.batchDelayMax}
                onChange={(e) => handleChange('batchDelayMax', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              Wait {config.perMessageMin / 1000}s - {config.perMessageMax / 1000}s between
              messages
            </li>
            <li>After every {config.batchSize} messages:</li>
            <li className="ml-4">
              Take a {config.batchDelayMin / 1000}s - {config.batchDelayMax / 1000}s break
            </li>
          </ul>
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button onClick={onClose}>Done</Button>
      </ModalFooter>
    </Modal>
  );
};
