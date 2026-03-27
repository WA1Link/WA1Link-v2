import { ipcMain, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { IPC_CHANNELS } from './channels';
import { messageRepository } from '../database/repositories/message.repository';
import { messageService } from '../services/whatsapp/message.service';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  MessageTemplate,
  BulkSendRequest,
} from '../../shared/types';

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
    await messageService.sendBulk(request);
  });

  // Stop sending
  ipcMain.handle(channels.STOP_SENDING, async (): Promise<void> => {
    messageService.stopSending();
  });

  // Set up event forwarding
  messageService.on('progress', (progress) => {
    mainWindow.webContents.send(channels.SENDING_PROGRESS, progress);
  });

  messageService.on('complete', (result) => {
    mainWindow.webContents.send(channels.SENDING_COMPLETE, result);
  });
}
