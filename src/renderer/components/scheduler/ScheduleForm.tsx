import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CreateJobInput, MessageTemplate, Target, DelayConfig } from '../../../shared/types';

interface ScheduleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateJobInput) => void;
  accountId: string;
  templates: MessageTemplate[];
  targets: Target[];
  delayConfig: DelayConfig;
  isLoading?: boolean;
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accountId,
  templates,
  targets,
  delayConfig,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const now = new Date();
  const [name, setName] = useState('');
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [time, setTime] = useState(now.toTimeString().slice(0, 5));
  const [errors, setErrors] = useState<{ name?: string; datetime?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; datetime?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (!date || !time) {
      newErrors.datetime = 'Date and time are required';
    }

    const scheduledAt = new Date(`${date}T${time}`);
    if (scheduledAt <= new Date()) {
      newErrors.datetime = 'Scheduled time must be in the future';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      accountId,
      templateIds: templates.filter((t) => t.isSelected).map((t) => t.id),
      scheduledAt: scheduledAt.toISOString(),
      targets,
      delayConfig,
    });

    handleClose();
  };

  const handleClose = () => {
    const closeNow = new Date();
    setName('');
    setDate(closeNow.toISOString().split('T')[0]);
    setTime(closeNow.toTimeString().slice(0, 5));
    setErrors({});
    onClose();
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('schedulerUi.form.title')} size="md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label={t('schedulerUi.form.campaignName')}
            placeholder={t('schedulerUi.form.campaignNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('schedulerUi.form.date')}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              error={errors.datetime && !date ? '!' : undefined}
            />
            <Input
              label={t('schedulerUi.form.time')}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              error={errors.datetime && !time ? '!' : undefined}
            />
          </div>

          {errors.datetime && date && time && (
            <p className="text-sm text-red-600">{errors.datetime}</p>
          )}

          {/* Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('schedulerUi.form.summary')}</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                {t('schedulerUi.form.summaryTemplates', {
                  count: templates.filter((tpl) => tpl.isSelected).length,
                })}
              </li>
              <li>
                {t('schedulerUi.form.summaryRecipients', { count: targets.length })}
              </li>
              <li>
                {t('schedulerUi.form.summaryDelay', {
                  min: delayConfig.perMessageMin / 1000,
                  max: delayConfig.perMessageMax / 1000,
                })}
              </li>
            </ul>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {t('schedulerUi.form.schedule')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
