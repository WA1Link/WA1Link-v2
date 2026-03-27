import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { accountRepository } from '../database/repositories/account.repository';
import { socketService } from '../services/whatsapp/socket.service';
import { CreateAccountInput, Account } from '../../shared/types';

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
    }
    accountRepository.delete(id);
  });

  // Connect account
  ipcMain.handle(
    channels.CONNECT,
    async (_, id: string, usePairingCode?: boolean, phoneNumber?: string): Promise<void> => {
      const account = accountRepository.getById(id);
      if (!account) {
        throw new Error('Account not found');
      }
      await socketService.connect(account, usePairingCode, phoneNumber);
    }
  );

  // Disconnect account
  ipcMain.handle(channels.DISCONNECT, async (_, id: string): Promise<void> => {
    await socketService.disconnect();
  });

  // Set up socket event forwarding
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
}
