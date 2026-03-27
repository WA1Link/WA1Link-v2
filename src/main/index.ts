import { app, BrowserWindow } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import { createMainWindow, getMainWindow } from './window';
import { initDatabase, closeDatabase } from './database';
import { registerAllIPC } from './ipc';
import { socketService } from './services/whatsapp/socket.service';
import { schedulerService } from './services/scheduler/scheduler.service';

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
  mainWindow?.webContents.send('update:available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  const mainWindow = getMainWindow();
  mainWindow?.webContents.send('update:downloaded', info);
});

autoUpdater.on('error', (error) => {
  console.error('Auto-update error:', error);
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup before quit
app.on('before-quit', async () => {
  // Stop scheduler
  schedulerService.stop();

  // Disconnect socket
  await socketService.disconnect();

  // Close database
  closeDatabase();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
