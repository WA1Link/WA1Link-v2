import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index';
import {
  MessageTemplate,
  TemplateContent,
  CreateTemplateInput,
  UpdateTemplateInput,
  ContentType,
} from '../../../shared/types';

interface TemplateRow {
  id: string;
  name: string | null;
  is_selected: number;
  created_at: string;
}

interface ContentRow {
  id: string;
  template_id: string;
  content_type: ContentType;
  content_value: string;
  sort_order: number;
}

function rowToContent(row: ContentRow): TemplateContent {
  return {
    id: row.id,
    templateId: row.template_id,
    contentType: row.content_type,
    contentValue: row.content_value,
    sortOrder: row.sort_order,
  };
}

function rowToTemplate(row: TemplateRow, contents: TemplateContent[]): MessageTemplate {
  return {
    id: row.id,
    name: row.name ?? '',
    isSelected: row.is_selected === 1,
    createdAt: row.created_at,
    contents,
  };
}

export class MessageRepository {
  createTemplate(input: CreateTemplateInput): MessageTemplate {
    const db = getDatabase();
    const templateId = uuidv4();

    db.prepare(`
      INSERT INTO message_templates (id, name)
      VALUES (?, ?)
    `).run(templateId, input.name);

    // Insert contents
    const insertContent = db.prepare(`
      INSERT INTO template_contents (id, template_id, content_type, content_value, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < input.contents.length; i++) {
      const content = input.contents[i];
      insertContent.run(
        uuidv4(),
        templateId,
        content.contentType,
        content.contentValue,
        content.sortOrder ?? i
      );
    }

    return this.getTemplateById(templateId)!;
  }

  getTemplateById(id: string): MessageTemplate | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM message_templates WHERE id = ?').get(id) as TemplateRow | undefined;

    if (!row) {
      return null;
    }

    const contentRows = db.prepare(
      'SELECT * FROM template_contents WHERE template_id = ? ORDER BY sort_order'
    ).all(id) as ContentRow[];

    return rowToTemplate(row, contentRows.map(rowToContent));
  }

  getAllTemplates(): MessageTemplate[] {
    const db = getDatabase();
    const templateRows = db.prepare('SELECT * FROM message_templates ORDER BY created_at DESC').all() as TemplateRow[];

    return templateRows.map((row) => {
      const contentRows = db.prepare(
        'SELECT * FROM template_contents WHERE template_id = ? ORDER BY sort_order'
      ).all(row.id) as ContentRow[];
      return rowToTemplate(row, contentRows.map(rowToContent));
    });
  }

  getSelectedTemplates(): MessageTemplate[] {
    const db = getDatabase();
    const templateRows = db.prepare(
      'SELECT * FROM message_templates WHERE is_selected = 1 ORDER BY created_at DESC'
    ).all() as TemplateRow[];

    return templateRows.map((row) => {
      const contentRows = db.prepare(
        'SELECT * FROM template_contents WHERE template_id = ? ORDER BY sort_order'
      ).all(row.id) as ContentRow[];
      return rowToTemplate(row, contentRows.map(rowToContent));
    });
  }

  updateTemplate(input: UpdateTemplateInput): MessageTemplate | null {
    const db = getDatabase();
    const existing = this.getTemplateById(input.id);

    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }

    if (input.isSelected !== undefined) {
      updates.push('is_selected = ?');
      values.push(input.isSelected ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(input.id);
      db.prepare(`
        UPDATE message_templates
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
    }

    // Update contents if provided
    if (input.contents !== undefined) {
      // Delete existing contents
      db.prepare('DELETE FROM template_contents WHERE template_id = ?').run(input.id);

      // Insert new contents
      const insertContent = db.prepare(`
        INSERT INTO template_contents (id, template_id, content_type, content_value, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < input.contents.length; i++) {
        const content = input.contents[i];
        insertContent.run(
          content.id ?? uuidv4(),
          input.id,
          content.contentType,
          content.contentValue,
          content.sortOrder ?? i
        );
      }
    }

    return this.getTemplateById(input.id);
  }

  deleteTemplate(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM message_templates WHERE id = ?').run(id);
    return result.changes > 0;
  }

  toggleTemplateSelection(id: string): MessageTemplate | null {
    const existing = this.getTemplateById(id);
    if (!existing) {
      return null;
    }

    return this.updateTemplate({
      id,
      isSelected: !existing.isSelected,
    });
  }

  deselectAllTemplates(): void {
    const db = getDatabase();
    db.prepare('UPDATE message_templates SET is_selected = 0').run();
  }
}

export const messageRepository = new MessageRepository();
