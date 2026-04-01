import React from 'react';
import { MessageTemplate } from '../../../shared/types';
import { Button } from '../ui/Button';

interface MessageTemplateListProps {
  templates: MessageTemplate[];
  onToggleSelect: (id: string) => void;
  onEdit: (template: MessageTemplate) => void;
  onDelete: (id: string) => void;
  onCheck?: (template: MessageTemplate) => void;
}

export const MessageTemplateList: React.FC<MessageTemplateListProps> = ({
  templates,
  onToggleSelect,
  onEdit,
  onDelete,
  onCheck,
}) => {
  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
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
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="mt-2">No message templates yet</p>
        <p className="text-sm">Create a template to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <div key={template.id} className="flex items-start gap-3">
          {/* Checkbox - outside the card */}
          <div className="pt-4">
            <input
              type="checkbox"
              checked={template.isSelected}
              onChange={() => onToggleSelect(template.id)}
              className="w-5 h-5 rounded border-gray-300 text-whatsapp-light focus:ring-whatsapp-light cursor-pointer"
            />
          </div>

          {/* Template card */}
          <div
            className={`
              card flex-1 min-w-0 transition-all
              ${template.isSelected ? 'ring-2 ring-whatsapp-light bg-whatsapp-light bg-opacity-5' : 'hover:shadow-md'}
            `}
          >
            <div className="flex items-start justify-between">
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {template.name || 'Untitled Template'}
                </h3>
                <div className="mt-2 space-y-1">
                  {template.contents.slice(0, 2).map((content) => (
                    <div key={content.id} className="text-sm text-gray-600">
                      {content.contentType === 'text' ? (
                        <p className="truncate">{content.contentValue}</p>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Image</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {template.contents.length > 2 && (
                    <p className="text-xs text-gray-400">
                      +{template.contents.length - 2} more items
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-2">
                {onCheck && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCheck(template)}
                    title="Preview template"
                  >
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(template)}
                  title="Edit template"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(template.id)}
                  className="text-red-600 hover:bg-red-50"
                  title="Delete template"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
