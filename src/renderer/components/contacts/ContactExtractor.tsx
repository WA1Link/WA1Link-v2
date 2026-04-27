import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContactStore } from '../../stores/useContactStore';
import { useAccountStore } from '../../stores/useAccountStore';
import { useUIStore } from '../../stores/useUIStore';
import { GroupSelector } from './GroupSelector';
import { ChatSelector } from './ChatSelector';
import { Button } from '../ui/Button';

type TabType = 'groups' | 'chats';

export const ContactExtractor: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('groups');

  const {
    groups,
    personalChats,
    selectedGroupIds,
    selectedChatJids,
    isLoadingGroups,
    isLoadingChats,
    isExporting,
    fetchGroups,
    fetchPersonalChats,
    toggleGroupSelection,
    toggleChatSelection,
    selectAllGroups,
    selectAllChats,
    deselectAllGroups,
    deselectAllChats,
    exportGroupContacts,
    exportPersonalContacts,
  } = useContactStore();

  const { activeAccountId } = useAccountStore();
  const { addToast } = useUIStore();

  const handleFetchGroups = async () => {
    if (!activeAccountId) {
      addToast({ type: 'error', message: t('contactsExtractor.needAccount') });
      return;
    }
    await fetchGroups(activeAccountId);
  };

  const handleFetchChats = async () => {
    if (!activeAccountId) {
      addToast({ type: 'error', message: t('contactsExtractor.needAccount') });
      return;
    }
    await fetchPersonalChats(activeAccountId);
  };

  const handleExport = async () => {
    if (!activeAccountId) {
      addToast({ type: 'error', message: t('contactsExtractor.needAccount') });
      return;
    }

    try {
      let filePath: string;
      if (activeTab === 'groups') {
        if (selectedGroupIds.size === 0) {
          addToast({ type: 'warning', message: 'Please select at least one group' });
          return;
        }
        filePath = await exportGroupContacts(activeAccountId);
      } else {
        if (selectedChatJids.size === 0) {
          addToast({ type: 'warning', message: 'Please select at least one chat' });
          return;
        }
        filePath = await exportPersonalContacts(activeAccountId);
      }
      if (filePath) {
        addToast({ type: 'success', message: `Exported to ${filePath}` });
      }
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message });
    }
  };

  const tabs = [
    { id: 'groups' as const, label: t('contactsExtractor.groupsTab'), count: groups.length },
    { id: 'chats' as const, label: t('contactsExtractor.personalTab'), count: personalChats.length },
  ];

  const hasSelection =
    activeTab === 'groups' ? selectedGroupIds.size > 0 : selectedChatJids.size > 0;

  return (
    <div className="card flex flex-col" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b mb-4 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
              ${
                activeTab === tab.id
                  ? 'border-whatsapp-light text-whatsapp-dark'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content - scrollable area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'groups' && (
          <GroupSelector
            groups={groups}
            selectedIds={selectedGroupIds}
            isLoading={isLoadingGroups}
            onToggle={toggleGroupSelection}
            onSelectAll={selectAllGroups}
            onDeselectAll={deselectAllGroups}
            onRefresh={handleFetchGroups}
          />
        )}

        {activeTab === 'chats' && (
          <ChatSelector
            chats={personalChats}
            selectedJids={selectedChatJids}
            isLoading={isLoadingChats}
            onToggle={toggleChatSelection}
            onSelectAll={selectAllChats}
            onDeselectAll={deselectAllChats}
            onRefresh={handleFetchChats}
          />
        )}
      </div>

      {/* Export Action - always visible at bottom */}
      <div className="flex items-center gap-3 pt-4 border-t flex-shrink-0">
        <Button
          onClick={handleExport}
          isLoading={isExporting}
          disabled={!hasSelection}
          leftIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          {t('contactsExtractor.exportToExcel')}
        </Button>
        <span className="text-sm text-gray-500">
          {activeTab === 'groups'
            ? t('contactsExtractor.groupsSelected', { count: selectedGroupIds.size })
            : t('contactsExtractor.chatsSelected', { count: selectedChatJids.size })}
        </span>
      </div>
    </div>
  );
};
