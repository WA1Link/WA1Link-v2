import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
    <Modal isOpen={isOpen} onClose={onClose} title={t('delays.title')} size="md">
      <div className="space-y-6">
        {/* Per-message delay */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('delays.messageDelay')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('delays.minimum')}
              type="number"
              min={0}
              value={config.perMessageMin}
              onChange={(e) => handleChange('perMessageMin', e.target.value)}
              helperText={t('delays.minMessageHint')}
            />
            <Input
              label={t('delays.maximum')}
              type="number"
              min={0}
              value={config.perMessageMax}
              onChange={(e) => handleChange('perMessageMax', e.target.value)}
              helperText={t('delays.maxMessageHint')}
            />
          </div>
        </div>

        {/* Batch settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('delays.batchSettings')}</h4>
          <div className="space-y-4">
            <Input
              label={t('delays.batchSize')}
              type="number"
              min={1}
              value={config.batchSize}
              onChange={(e) => handleChange('batchSize', e.target.value)}
              helperText={t('delays.batchSizeHint')}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('delays.batchDelayMin')}
                type="number"
                min={0}
                value={config.batchDelayMin}
                onChange={(e) => handleChange('batchDelayMin', e.target.value)}
              />
              <Input
                label={t('delays.batchDelayMax')}
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
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('delays.preview')}</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              {t('delays.previewWait', {
                min: config.perMessageMin / 1000,
                max: config.perMessageMax / 1000,
              })}
            </li>
            <li>{t('delays.previewBatch', { count: config.batchSize })}</li>
            <li className="ml-4">
              {t('delays.previewBatchBreak', {
                min: config.batchDelayMin / 1000,
                max: config.batchDelayMax / 1000,
              })}
            </li>
          </ul>
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleReset}>
          {t('delays.resetDefaults')}
        </Button>
        <Button onClick={onClose}>{t('delays.done')}</Button>
      </ModalFooter>
    </Modal>
  );
};
