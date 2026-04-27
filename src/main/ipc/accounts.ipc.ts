import { ipcMain, BrowserWindow, app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { IPC_CHANNELS } from './channels';
import { accountRepository } from '../database/repositories/account.repository';
import { socketService } from '../services/whatsapp/socket.service';
import { CreateAccountInput, Account } from '../../shared/types';

let listenersRegistered = false;

export function registerAccountIPC(mainWindow: BrowserWindow): void {
  const channels = IPC_CHANNELS.ACCOUNT;

  // Create account
  ipcMain.handle(channels.CREATE, async (_, input: CreateAccountInput): Promise<Account> => {
    return accountRepository.create(input);
  });

  // Get all accounts
  ipcMain.handle(channels.GET_ALL, async (): Promise<Account[]> => {
    return accountRepository.getAll();
  });

  // Delete account
  ipcMain.handle(channels.DELETE, async (_, id: string): Promise<void> => {
    // Disconnect if this is the active account
    if (socketService.getActiveAccountId() === id) {
      await socketService.logout(id);
    } else {
      // Orphan auth_sessions/<id> would otherwise be left on disk
      const sessionDir = path.join(
        app.getPath('userData'),
        'auth_sessions',
        'wa1link-whatsapp-auth',
        id
      );
      try {
        await fs.rm(sessionDir, { recursive: true, force: true });
      } catch {}
    }
    accountRepository.delete(id);
  });

  // Connect account
  ipcMain.handle(
    channels.CONNECT,
    async (_, id: string, usePairingCode?: boolean, phoneNumber?: string): Promise<void> => {
      if (typeof id !== 'string' || id.length === 0) {
        throw new Error('Invalid account id');
      }
      const account = accountRepository.getById(id);
      if (!account) {
        throw new Error('Account not found');
      }
      await socketService.connect(account, usePairingCode, phoneNumber);
    }
  );

  // Disconnect account — only acts if the requested account is the active one
  ipcMain.handle(channels.DISCONNECT, async (_, id: string): Promise<void> => {
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('Invalid account id');
    }
    if (socketService.getActiveAccountId() !== id) {
      return;
    }
    await socketService.disconnect();
  });

  // Set up socket event forwarding (only once per process — listeners are
  // EventEmitters and would otherwise stack on hot reloads)
  if (listenersRegistered) return;
  listenersRegistered = true;

  socketService.on('status-changed', (data) => {
    mainWindow.webContents.send(channels.STATUS_CHANGED, data);
  });

  socketService.on('qr', (data) => {
    mainWindow.webContents.send(channels.QR_RECEIVED, {
      accountId: data.accountId,
      qrCode: data.qrCode,
    });
  });

  socketService.on('pairing-code', (data) => {
    mainWindow.webContents.send(channels.PAIRING_CODE_RECEIVED, {
      accountId: data.accountId,
      code: data.pairingCode,
    });
  });

  socketService.on('error', (data) => {
    mainWindow.webContents.send(channels.ERROR, {
      accountId: data.accountId,
      error: data.error,
    });
  });

  socketService.on('reconnecting', (data) => {
    mainWindow.webContents.send(channels.RECONNECTING, {
      accountId: data.accountId,
      attempt: data.attempt,
      delayMs: data.delayMs,
    });
  });
}
