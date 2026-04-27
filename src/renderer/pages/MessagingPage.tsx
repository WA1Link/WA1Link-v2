import React, { useEffect, useState } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { useSendingStore } from '../stores/useSendingStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useScheduleStore } from '../stores/useScheduleStore';
import { useUIStore } from '../stores/useUIStore';
import { AccountManager } from '../components/accounts/AccountManager';
import { MessageComposer } from '../components/messaging/MessageComposer';
import { MessageTemplateList } from '../components/messaging/MessageTemplateList';
import { TargetUploader } from '../components/targets/TargetUploader';
import { TargetList } from '../components/targets/TargetList';
import { CampaignLauncher } from '../components/sending/CampaignLauncher';
import { SendingProgressComponent } from '../components/sending/SendingProgress';
import { DelaySettings } from '../components/sending/DelaySettings';
import { ScheduleForm } from '../components/scheduler/ScheduleForm';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CreateTemplateInput, UpdateTemplateInput, Target, MessageTemplate } from '../../shared/types';

export const MessagingPage: React.FC = () => {
  const [showComposer, setShowComposer] = useState(false);
  const [showDelaySettings, setShowDelaySettings] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  const {
    templates,
    targets,
    isLoading: isLoadingTemplates,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateSelection,
    setTargets,
    clearTargets,
    getSelectedTemplates,
  } = useMessageStore();

  const {
    isSending,
    delayConfig,
    progress,
    startSending,
    stopSending,
    updateProgress,
    onSendingComplete,
    setDelayConfig,
  } = useSendingStore();

  const { activeAccountId, connectionStatus } = useAccountStore();
  const { createJob } = useScheduleStore();
  const { addToast } = useUIStore();

  const isConnected = activeAccountId
    ? connectionStatus.get(activeAccountId) === 'connected'
    : false;

  // Set up IPC listeners
  useEffect(() => {
    const unsubProgress = window.electronAPI.message.onProgress((prog) => {
      updateProgress(prog);
    });

    const unsubComplete = window.electronAPI.message.onComplete((result) => {
      onSendingComplete(result);
      const crmInfo = result.crmStats
        ? ` | CRM: ${result.crmStats.newContacts} new, ${result.crmStats.skippedContacts} existing`
        : '';
      addToast({ type: 'success', message: `Sending complete: ${result.sent} sent, ${result.failed} failed${crmInfo}` });
    });

    return () => {
      unsubProgress();
      unsubComplete();
    };
  }, []);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleTemplateSubmit = async (input: CreateTemplateInput | UpdateTemplateInput) => {
    try {
      if ('id' in input) {
        await updateTemplate(input);
        addToast({ type: 'success', message: 'Template updated' });
      } else {
        await createTemplate(input);
        addToast({ type: 'success', message: 'Template created' });
      }
      setShowComposer(false);
      setEditingTemplate(null);
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteTemplate(id);
        addToast({ type: 'success', message: 'Template deleted' });
      } catch (error) {
        addToast({ type: 'error', message: (error as Error).message });
      }
    }
  };

  const handleStartSending = async () => {
    if (!activeAccountId) {
      addToast({ type: 'error', message: 'Please connect an account first' });
      return;
    }

    const selectedTemplates = getSelectedTemplates();
    if (selectedTemplates.length === 0) {
      addToast({ type: 'error', message: 'Please select at least one template' });
      return;
    }

    if (targets.length === 0) {
      addToast({ type: 'error', message: 'Please upload target contacts' });
      return;
    }

    startSending();

    try {
      await window.electronAPI.message.sendBulk({
        accountId: activeAccountId,
        templateIds: selectedTemplates.map((t) => t.id),
        targets,
        delayConfig,
      });
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message });
    }
  };

  const handleStopSending = async () => {
    await stopSending();
    addToast({ type: 'info', message: 'Sending stopped' });
  };

  const handleSchedule = async (input: any) => {
    try {
      await createJob(input);
      setShowScheduleForm(false);
      addToast({ type: 'success', message: 'Campaign scheduled' });
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message });
    }
  };

  const selectedTemplates = getSelectedTemplates();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Messaging</h1>

      {/* Account Manager */}
      <AccountManager />

      {/* Sending Progress */}
      {(isSending || progress) && (
        <SendingProgressComponent
          progress={progress}
          isSending={isSending}
          onStop={handleStopSending}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Templates */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Message Templates</h2>
              <p className="text-sm text-gray-500">
                {selectedTemplates.length} of {templates.length} selected
              </p>
            </div>
            <Button
              onClick={() => { setEditingTemplate(null); setShowComposer(true); }}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Template
            </Button>
          </div>

          <div className="max-h-[500px] overflow-y-auto pr-2 -mr-2">
            <MessageTemplateList
              templates={templates}
              onToggleSelect={toggleTemplateSelection}
              onEdit={(template) => {
                setEditingTemplate(template);
                setShowComposer(true);
              }}
              onDelete={handleDeleteTemplate}
              onCheck={(template) => setPreviewTemplate(template)}
            />
          </div>
        </div>

        {/* Targets */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Target Contacts</h2>

          {targets.length === 0 ? (
            <TargetUploader onTargetsLoaded={setTargets} />
          ) : (
            <TargetList targets={targets} onClear={clearTargets} />
          )}
        </div>
      </div>

      {/* Campaign Launcher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CampaignLauncher
          selectedTemplates={selectedTemplates}
          targets={targets}
          delayConfig={delayConfig}
          isConnected={isConnected}
          isSending={isSending}
          onOpenDelaySettings={() => setShowDelaySettings(true)}
          onStartSending={handleStartSending}
        />

        {/* Schedule Button */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Schedule for Later</h3>
          <p className="text-sm text-gray-500 mb-4">
            Want to send at a specific time? Schedule your campaign and let it run automatically.
          </p>
          <Button
            variant="secondary"
            onClick={() => setShowScheduleForm(true)}
            disabled={
              selectedTemplates.length === 0 || targets.length === 0 || !activeAccountId
            }
            className="w-full"
            leftIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          >
            Schedule Campaign
          </Button>
        </div>
      </div>

      {/* Modals */}
      <MessageComposer
        isOpen={showComposer}
        onClose={() => { setShowComposer(false); setEditingTemplate(null); }}
        onSubmit={handleTemplateSubmit}
        isLoading={isLoadingTemplates}
        editTemplate={editingTemplate}
      />

      <DelaySettings
        isOpen={showDelaySettings}
        onClose={() => setShowDelaySettings(false)}
        config={delayConfig}
        onChange={setDelayConfig}
      />

      {activeAccountId && (
        <ScheduleForm
          isOpen={showScheduleForm}
          onClose={() => setShowScheduleForm(false)}
          onSubmit={handleSchedule}
          accountId={activeAccountId}
          templates={templates}
          targets={targets}
          delayConfig={delayConfig}
        />
      )}

      {/* Template Preview Modal */}
      <Modal
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        title={`Preview: ${previewTemplate?.name || 'Untitled'}`}
        size="md"
      >
        {previewTemplate && (
          <div className="space-y-3">
            {previewTemplate.contents.length === 0 ? (
              <p className="text-sm text-red-600">This template has no content.</p>
            ) : (
              previewTemplate.contents.map((content) => (
                <div key={content.id} className="p-3 bg-gray-50 rounded-lg">
                  {content.contentType === 'text' ? (
                    <div>
                      <span className="text-xs font-medium text-gray-400 uppercase">Text</span>
                      <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap break-words">{content.contentValue}</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-medium text-gray-400 uppercase">Image</span>
                      <p className="mt-1 text-sm text-gray-600 truncate">
                        {content.contentValue ? content.contentValue.split(/[/\\]/).pop() : 'No file'}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
            {previewTemplate.contents.some((c) => c.contentValue.includes('{{')) && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-700">
                  Variables detected: {
                    [...new Set(
                      previewTemplate.contents
                        .flatMap((c) => [...c.contentValue.matchAll(/\{\{(.*?)\}\}/g)])
                        .map((m) => `{{${m[1]}}}`)
                    )].join(', ')
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
