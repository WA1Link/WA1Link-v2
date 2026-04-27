import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSendingStore } from '../stores/useSendingStore';
import { useScheduleStore } from '../stores/useScheduleStore';
import { useUIStore } from '../stores/useUIStore';

/**
 * Subscribes to renderer-wide IPC events that should be live for the whole
 * app session. Mount once at the App root, not per-page — otherwise events
 * fired while the user is on a different page get dropped, freezing the
 * progress UI on the Messaging page when the user navigates away mid-send.
 */
export function useGlobalSubscriptions(): void {
  const { t } = useTranslation();
  const updateProgress = useSendingStore((s) => s.updateProgress);
  const onSendingComplete = useSendingStore((s) => s.onSendingComplete);
  const updateJobProgress = useScheduleStore((s) => s.updateJobProgress);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    const unsubProgress = window.electronAPI.message.onProgress((prog) => {
      updateProgress(prog);
    });

    const unsubComplete = window.electronAPI.message.onComplete((result) => {
      onSendingComplete(result);
      const message = result.crmStats
        ? t('pages.messaging.sendingCompleteWithCrm', {
            sent: result.sent,
            failed: result.failed,
            newContacts: result.crmStats.newContacts,
            skippedContacts: result.crmStats.skippedContacts,
          })
        : t('pages.messaging.sendingComplete', { sent: result.sent, failed: result.failed });
      addToast({ type: 'success', message });
    });

    const unsubJobProgress = window.electronAPI.scheduler.onJobProgress((progress) => {
      updateJobProgress(progress);
    });

    return () => {
      unsubProgress();
      unsubComplete();
      unsubJobProgress();
    };
    // Empty deps — these listeners must live for the whole app session.
  }, []);
}
