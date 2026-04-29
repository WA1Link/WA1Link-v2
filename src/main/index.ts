import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import { createMainWindow, getMainWindow } from './window';
import { initDatabase, closeDatabase } from './database';
import { registerAllIPC } from './ipc';
import { socketService } from './services/whatsapp/socket.service';
import { schedulerService } from './services/scheduler/scheduler.service';
import { reportStartup } from './services/telemetry/tmstat.service';
import { IPC_CHANNELS } from '../shared/constants/channels';

// Use a different userData path to avoid GPU cache lock issues
const isDev = !app.isPackaged;
if (isDev) {
  app.setPath('userData', path.join(app.getPath('appData'), 'wa1link-v2-dev'));
}

// Disable GPU to prevent cache issues
app.disableHardwareAcceleration();

// Handle creating/removing shortcuts on Windows when installing/uninstalling
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // Module not available in development
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// App ready
app.whenReady().then(async () => {
  // Initialize database
  initDatabase();

  // Create main window
  const mainWindow = createMainWindow();

  // Set main window reference for socket service
  socketService.setMainWindow(mainWindow);

  // Register IPC handlers
  registerAllIPC(mainWindow);

  // Start scheduler
  schedulerService.start();

  // Fire telemetry ping (non-blocking; failures are swallowed)
  void reportStartup();

  // Check for updates (production only)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();

    // Check periodically (every 4 hours)
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 4 * 60 * 60 * 1000);
  }

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Handle auto-updater events
autoUpdater.on('update-available', (info) => {
  const mainWindow = getMainWindow();
  mainWindow?.webContents.send(IPC_CHANNELS.UPDATE.AVAILABLE, info);
});

autoUpdater.on('update-downloaded', (info) => {
  const mainWindow = getMainWindow();
  mainWindow?.webContents.send(IPC_CHANNELS.UPDATE.DOWNLOADED, info);
});

autoUpdater.on('error', (error) => {
  console.error('Auto-update error:', error);
});

// Handle update install request
ipcMain.handle(IPC_CHANNELS.UPDATE.INSTALL, () => {
  autoUpdater.quitAndInstall();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup before quit. Electron does not await async before-quit handlers
// by default, so we preventDefault, run cleanup, then exit explicitly.
// Both the first event AND any re-entrant events while cleanup is running
// must call preventDefault() — otherwise a second quit (e.g. user double-
// pressing Cmd+Q) would let Electron tear the process down while the first
// cleanup is still flushing the DB / disconnecting the socket.
let cleaningUp = false;
app.on('before-quit', (event) => {
  if (cleaningUp) {
    event.preventDefault();
    return;
  }
  cleaningUp = true;
  event.preventDefault();

  // Force exit after 5 seconds even if cleanup hangs (e.g. baileys' socket.end
  // never resolves on a broken websocket). Without this fallback the app
  // would be impossible to quit.
  const forceExit = setTimeout(() => {
    console.warn('Cleanup timed out after 5s; forcing exit.');
    app.exit(0);
  }, 5000);

  (async () => {
    try {
      schedulerService.stop();
      await socketService.disconnect();
      closeDatabase();
    } catch (err) {
      console.error('Error during cleanup:', err);
    } finally {
      clearTimeout(forceExit);
      app.exit(0);
    }
  })();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
