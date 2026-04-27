import React from 'react';
import { useTranslation } from 'react-i18next';
import { WhatsAppGroup } from '../../../shared/types';
import { Button } from '../ui/Button';

interface GroupSelectorProps {
  groups: WhatsAppGroup[];
  selectedIds: Set<string>;
  isLoading: boolean;
  onToggle: (groupId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRefresh: () => void;
}

export const GroupSelector: React.FC<GroupSelectorProps> = ({
  groups,
  selectedIds,
  isLoading,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const totalParticipants = groups
    .filter((g) => selectedIds.has(g.id))
    .reduce((sum, g) => sum + g.participantCount, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-900">{t('contactsExtractor.groups.title')}</h3>
          <p className="text-sm text-gray-500">
            {t('contactsExtractor.groups.selectedSummary', {
              groups: selectedIds.size,
              participants: totalParticipants,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            {t('common.selectAll')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDeselectAll}>
            {t('common.clear')}
          </Button>
          <Button variant="secondary" size="sm" onClick={onRefresh} isLoading={isLoading}>
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Group List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg
            className="animate-spin h-8 w-8 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="mt-2">{t('contactsExtractor.groups.empty')}</p>
          <p className="text-sm">{t('contactsExtractor.groups.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const isSelected = selectedIds.has(group.id);

            return (
              <label
                key={group.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                  ${isSelected ? 'bg-whatsapp-light bg-opacity-10' : 'hover:bg-gray-50'}
                `}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(group.id)}
                  className="w-5 h-5 rounded border-gray-300 text-whatsapp-light focus:ring-whatsapp-light"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{group.name}</p>
                  <p className="text-sm text-gray-500">{group.participantCount} participants</p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};
