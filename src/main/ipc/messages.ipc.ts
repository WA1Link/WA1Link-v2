import { ipcMain, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { IPC_CHANNELS } from './channels';
import { messageRepository } from '../database/repositories/message.repository';
import { messageService } from '../services/whatsapp/message.service';
import { schedulerService } from '../services/scheduler/scheduler.service';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  MessageTemplate,
  BulkSendRequest,
} from '../../shared/types';

let listenersRegistered = false;

export function registerMessageIPC(mainWindow: BrowserWindow): void {
  const channels = IPC_CHANNELS.MESSAGE;

  // Create template
  ipcMain.handle(
    channels.CREATE_TEMPLATE,
    async (_, input: CreateTemplateInput): Promise<MessageTemplate> => {
      return messageRepository.createTemplate(input);
    }
  );

  // Get all templates
  ipcMain.handle(channels.GET_ALL_TEMPLATES, async (): Promise<MessageTemplate[]> => {
    return messageRepository.getAllTemplates();
  });

  // Update template
  ipcMain.handle(
    channels.UPDATE_TEMPLATE,
    async (_, input: UpdateTemplateInput): Promise<MessageTemplate | null> => {
      return messageRepository.updateTemplate(input);
    }
  );

  // Delete template
  ipcMain.handle(channels.DELETE_TEMPLATE, async (_, id: string): Promise<void> => {
    messageRepository.deleteTemplate(id);
  });

  // Select image via native file dialog, copy to app storage, return stored path
  ipcMain.handle(channels.SELECT_IMAGE, async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Image',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const sourcePath = result.filePaths[0];
    const imagesDir = path.join(app.getPath('userData'), 'images');

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const ext = path.extname(sourcePath);
    const destName = `${Date.now()}${ext}`;
    const destPath = path.join(imagesDir, destName);

    fs.copyFileSync(sourcePath, destPath);
    return destPath;
  });

  // Send bulk messages
  ipcMain.handle(channels.SEND_BULK, async (_, request: BulkSendRequest): Promise<void> => {
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid send request: payload must be an object');
    }
    if (typeof request.accountId !== 'string' || request.accountId.length === 0) {
      throw new Error('Invalid send request: accountId is required');
    }
    if (!Array.isArray(request.templateIds) || request.templateIds.length === 0) {
      throw new Error('Invalid send request: templateIds must be a non-empty array');
    }
    if (!Array.isArray(request.targets) || request.targets.length === 0) {
      throw new Error('Invalid send request: targets must be a non-empty array');
    }
    for (let i = 0; i < request.targets.length; i++) {
      const t = request.targets[i] as unknown;
      if (!t || typeof t !== 'object') {
        throw new Error(`Invalid send request: targets[${i}] must be an object`);
      }
      const phoneNumber = (t as { phoneNumber?: unknown }).phoneNumber;
      if (typeof phoneNumber !== 'string' || phoneNumber.length === 0) {
        throw new Error(`Invalid send request: targets[${i}].phoneNumber must be a non-empty string`);
      }
    }
    if (!request.delayConfig || typeof request.delayConfig !== 'object') {
      throw new Error('Invalid send request: delayConfig is required');
    }
    const dc = request.delayConfig as unknown as Record<string, unknown>;
    const numericFields = [
      'perMessageMin',
      'perMessageMax',
      'batchSize',
      'batchDelayMin',
      'batchDelayMax',
    ] as const;
    for (const field of numericFields) {
      const v = dc[field];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        throw new Error(`Invalid send request: delayConfig.${field} must be a finite non-negative number`);
      }
    }
    if ((dc.perMessageMin as number) > (dc.perMessageMax as number)) {
      throw new Error('Invalid send request: delayConfig.perMessageMin must be <= perMessageMax');
    }
    if ((dc.batchDelayMin as number) > (dc.batchDelayMax as number)) {
      throw new Error('Invalid send request: delayConfig.batchDelayMin must be <= batchDelayMax');
    }
    if ((dc.batchSize as number) < 1) {
      throw new Error('Invalid send request: delayConfig.batchSize must be >= 1');
    }
    // Route direct sends through the scheduler so they get persisted to the
    // job_targets table and show up in "Sent Messages History" alongside
    // scheduled jobs. Reuses runJob's existing per-target persistence,
    // status tracking, and event listener cleanup.
    await schedulerService.runDirectSend(request);
  });

  // Stop sending — cancels the currently running job (direct or scheduled)
  // so its DB row is marked 'cancelled' instead of getting overwritten with
  // 'completed' when the abort propagates through messageService.
  ipcMain.handle(channels.STOP_SENDING, async (): Promise<void> => {
    schedulerService.cancelCurrentJob();
  });

  // Set up event forwarding (only once per process — listeners are EventEmitters
  // and would otherwise stack on hot reloads)
  if (listenersRegistered) return;
  listenersRegistered = true;

  messageService.on('progress', (progress) => {
    mainWindow.webContents.send(channels.SENDING_PROGRESS, progress);
  });

  messageService.on('complete', (result) => {
    mainWindow.webContents.send(channels.SENDING_COMPLETE, result);
  });

  messageService.on('error', (error) => {
    mainWindow.webContents.send(channels.SENDING_ERROR, error);
  });

  messageService.on('target-result', (result) => {
    mainWindow.webContents.send(channels.TARGET_RESULT, result);
  });
}
