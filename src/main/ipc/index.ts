import { BrowserWindow } from 'electron';
import { registerAccountIPC } from './accounts.ipc';
import { registerMessageIPC } from './messages.ipc';
import { registerContactIPC } from './contacts.ipc';
import { registerSchedulerIPC } from './scheduler.ipc';
import { registerLicenseIPC } from './license.ipc';
import { registerCRMIPC } from './crm.ipc';

export function registerAllIPC(mainWindow: BrowserWindow): void {
  registerAccountIPC(mainWindow);
  registerMessageIPC(mainWindow);
  registerContactIPC(mainWindow);
  registerSchedulerIPC(mainWindow);
  registerLicenseIPC(mainWindow);
  registerCRMIPC(mainWindow);
}
