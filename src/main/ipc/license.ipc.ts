import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { licenseService } from '../services/license/license.service';
import { getIconPath } from '../window';
import { LicensePayload, LicenseState } from '../../shared/types';

export function registerLicenseIPC(mainWindow: BrowserWindow): void {
  const channels = IPC_CHANNELS.LICENSE;

  // Initialize license service (loads persisted license from DB)
  licenseService.init();

  // Activate license from raw license string (verifies signature + persists)
  ipcMain.handle(
    channels.ACTIVATE,
    async (_, licenseString: string): Promise<LicenseState> => {
      return licenseService.activateLicense(licenseString);
    }
  );

  // Validate license payload (legacy)
  ipcMain.handle(
    channels.VALIDATE,
    async (_, payload: LicensePayload): Promise<LicenseState> => {
      return licenseService.validatePayload(payload);
    }
  );

  // Get license state (re-validates from DB)
  ipcMain.handle(channels.GET_STATE, async (): Promise<LicenseState> => {
    return licenseService.getState();
  });

  // Get device fingerprint
  ipcMain.handle(channels.GET_FINGERPRINT, async (): Promise<string> => {
    return licenseService.getFingerprint();
  });

  // Open license purchase page in a new window
  ipcMain.handle(channels.OPEN_LICENSE_PAGE, async (): Promise<void> => {
    const licenseWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      parent: mainWindow,
      modal: true,
      title: 'Get a License',
      icon: getIconPath(),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    licenseWindow.setMenuBarVisibility(false);
    licenseWindow.loadURL('https://1link.so/payment_toplu_mesaj');
  });

  // Periodic re-validation every hour
  setInterval(() => {
    const state = licenseService.getState();
    mainWindow.webContents.send(channels.GET_STATE, state);
  }, 3600000);
}
