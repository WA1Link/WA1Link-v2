import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Modal, ModalFooter } from '../ui/Modal';
import { CreateTemplateInput, UpdateTemplateInput, ContentType, MessageTemplate } from '../../../shared/types';

interface MessageComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTemplateInput | UpdateTemplateInput) => void;
  isLoading?: boolean;
  editTemplate?: MessageTemplate | null;
}

interface ContentItem {
  id: string;
  contentType: ContentType;
  contentValue: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  editTemplate = null,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [contents, setContents] = useState<ContentItem[]>([
    { id: '1', contentType: 'text', contentValue: '' },
  ]);

  const isEditing = !!editTemplate;

  // Populate form when editing
  useEffect(() => {
    if (editTemplate && isOpen) {
      setName(editTemplate.name || '');
      setContents(
        editTemplate.contents.length > 0
          ? editTemplate.contents.map((c) => ({
              id: c.id,
              contentType: c.contentType,
              contentValue: c.contentValue,
            }))
          : [{ id: '1', contentType: 'text', contentValue: '' }]
      );
    }
  }, [editTemplate, isOpen]);

  const handleAddText = () => {
    setContents([
      ...contents,
      { id: Date.now().toString(), contentType: 'text', contentValue: '' },
    ]);
  };

  const handleAddImage = async () => {
    const filePath = await window.electronAPI.message.selectImage();
    if (filePath) {
      setContents([
        ...contents,
        { id: Date.now().toString(), contentType: 'image', contentValue: filePath },
      ]);
    }
  };

  const handleUpdateContent = (id: string, value: string) => {
    setContents(contents.map((c) => (c.id === id ? { ...c, contentValue: value } : c)));
  };

  const handleRemoveContent = (id: string) => {
    if (contents.length > 1) {
      setContents(contents.filter((c) => c.id !== id));
    }
  };

  const insertVariable = (variable: string) => {
    const lastTextContent = [...contents].reverse().find((c) => c.contentType === 'text');
    if (lastTextContent) {
      handleUpdateContent(lastTextContent.id, lastTextContent.contentValue + `{{${variable}}}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validContents = contents.filter((c) => c.contentValue.trim());
    if (validContents.length === 0) return;

    if (isEditing) {
      onSubmit({
        id: editTemplate!.id,
        name: name || editTemplate!.name,
        contents: validContents.map((c, i) => ({
          id: c.id,
          contentType: c.contentType,
          contentValue: c.contentValue,
          sortOrder: i,
        })),
      } as UpdateTemplateInput);
    } else {
      onSubmit({
        name: name || `Template ${Date.now()}`,
        contents: validContents.map((c, i) => ({
          contentType: c.contentType,
          contentValue: c.contentValue,
          sortOrder: i,
        })),
      } as CreateTemplateInput);
    }

    resetForm();
  };

  const resetForm = () => {
    setName('');
    setContents([{ id: '1', contentType: 'text', contentValue: '' }]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? t('messageTemplates.composer.editTitle') : t('messageTemplates.composer.createTitle')}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label={t('messageTemplates.composer.templateName')}
            placeholder={t('messageTemplates.composer.templateNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Variable buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('messageTemplates.composer.insertVariable')}
            </label>
            <div className="flex flex-wrap gap-2">
              {['Name', 'Number', 'Company', 'Email', 'Custom1', 'Custom2'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Content items */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">{t('messageTemplates.composer.messageContent')}</label>
            {contents.map((content) => (
              <div key={content.id} className="flex gap-2">
                {content.contentType === 'text' ? (
                  <Textarea
                    placeholder={t('messageTemplates.composer.messageContentPlaceholder')}
                    value={content.contentValue}
                    onChange={(e) => handleUpdateContent(content.id, e.target.value)}
                    rows={3}
                    className="flex-1"
                  />
                ) : (
                  <div className="flex-1 p-3 border rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-600 truncate">
                      {t('messageTemplates.composer.imageLabel', {
                        filename: content.contentValue ? content.contentValue.split(/[/\\]/).pop() : '—',
                      })}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={async () => {
                        const filePath = await window.electronAPI.message.selectImage();
                        if (filePath) {
                          handleUpdateContent(content.id, filePath);
                        }
                      }}
                    >
                      {t('messageTemplates.composer.chooseImage')}
                    </Button>
                  </div>
                )}
                {contents.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveContent(content.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add content buttons */}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleAddText}>
              {t('messageTemplates.composer.addText')}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleAddImage}>
              {t('messageTemplates.composer.addImage')}
            </Button>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEditing ? t('messageTemplates.composer.saveChanges') : t('messageTemplates.composer.create')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
