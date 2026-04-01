import { BrowserWindow, app, Menu, shell } from 'electron';
import path from 'path';
import os from 'os';

let mainWindow: BrowserWindow | null = null;

function getIconPath(): string {
  // In dev: src/main/ compiles to dist/main/main/, so go 3 levels up
  // In prod: files are inside app.asar, __dirname is inside resources/app.asar/dist/main/main
  const base = path.join(__dirname, '../../..');

  return os.type() === 'Darwin'
    ? path.join(base, 'build', 'logoWa1Link.icns')
    : path.join(base, 'build', 'logoWa1Link.ico');
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for better-sqlite3
      webSecurity: false, // Allow loading from localhost in dev
    },
    titleBarStyle: 'default',
    show: true,
    backgroundColor: '#1a1a2e',
  });

  mainWindow.setTitle('WA1Link');

  if (!app.isPackaged) {
    // Hide menu in production
  } else {
    Menu.setApplicationMenu(null);
  }

  const isDev = !app.isPackaged;
  const devUrl = 'http://localhost:3000';

  console.log('[Window] Creating window, isDev:', isDev);

  const loadApp = async () => {
    const maxRetries = 10;
    const retryDelay = 2000;

    for (let i = 0; i < maxRetries; i++) {
      if (!mainWindow || mainWindow.isDestroyed()) {
        console.log('[Window] Window destroyed, stopping load attempts');
        return;
      }

      try {
        console.log(`[Window] Loading attempt ${i + 1}/${maxRetries}...`);

        if (isDev) {
          await mainWindow.loadURL(devUrl);
        } else {
          await mainWindow.loadFile(path.join(__dirname, '../../../build/index.html'));
        }

        console.log('[Window] Loaded successfully');
        return; // Success
      } catch (err: any) {
        console.error(`[Window] Failed to load (attempt ${i + 1}/${maxRetries}):`, err.message);

        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    console.error('[Window] All load attempts failed');
    // Show error in window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(`data:text/html,
        <html>
          <body style="background:#1a1a2e;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
            <div style="text-align:center;">
              <h1>Failed to connect</h1>
              <p>Could not connect to development server at ${devUrl}</p>
              <p>Make sure React dev server is running</p>
              <button onclick="location.reload()" style="padding:10px 20px;margin-top:20px;cursor:pointer;">Retry</button>
            </div>
          </body>
        </html>
      `);
    }
  };

  // Start loading after a short delay to let React server stabilize
  setTimeout(() => {
    loadApp();
  }, isDev ? 2000 : 0);

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle load failures with retry
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Window] did-fail-load:', errorCode, errorDescription, validatedURL);
    // Don't auto-retry here since loadApp already handles retries
  });

  // Log any renderer errors
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Window] Renderer process gone:', details);
  });

  // Handle window close
  mainWindow.on('closed', () => {
    console.log('[Window] Window closed');
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
