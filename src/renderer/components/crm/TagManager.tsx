import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCRMStore } from '../../stores/useCRMStore';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal, ModalFooter } from '../ui/Modal';
import { Tag, DEFAULT_TAG_COLORS } from '../../../shared/types';

export const TagManager: React.FC = () => {
  const { t } = useTranslation();
  const { tags, fetchTags, createTag, updateTag, deleteTag } = useCRMStore();
  const addToast = useUIStore((s) => s.addToast);

  const [editing, setEditing] = useState<Tag | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_TAG_COLORS[0]);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor(DEFAULT_TAG_COLORS[0]);
    setIsFormOpen(true);
  };

  const openEdit = (tag: Tag) => {
    setEditing(tag);
    setName(tag.name);
    setColor(tag.color);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateTag({ id: editing.id, name, color });
        addToast({ type: 'success', message: t('tags.updated') });
      } else {
        await createTag({ name, color });
        addToast({ type: 'success', message: t('tags.created') });
      }
      setIsFormOpen(false);
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTag(deleteTarget.id);
      addToast({ type: 'success', message: t('tags.deleted') });
      setDeleteTarget(null);
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('tags.title')}</h2>
          <p className="text-sm text-gray-500">{t('tags.description')}</p>
        </div>
        <Button onClick={openCreate}>+ {t('tags.addTag')}</Button>
      </div>

      {tags.length === 0 ? (
        <div className="border border-dashed rounded-lg p-8 text-center text-gray-500">
          {t('tags.empty')}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span
                  className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(tag)}>
                  {t('common.edit')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(tag)}>
                  <span className="text-red-500">{t('common.delete')}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? t('tags.editTitle') : t('tags.createTitle')}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label={t('tags.nameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('tags.namePlaceholder')}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tags.colorLabel')}
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition ${
                    color === c ? 'border-gray-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tags.preview')}
            </label>
            <span
              className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {name.trim() || t('tags.namePlaceholder')}
            </span>
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {t('common.save')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('tags.deleteConfirm')}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          <strong>{deleteTarget?.name}</strong>
        </p>
        <p className="text-xs text-gray-500 mt-2">{t('tags.deleteWarning')}</p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
