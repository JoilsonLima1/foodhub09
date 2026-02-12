import { app, BrowserWindow, ipcMain, session, Menu } from 'electron';
import path from 'path';
import { printReceipt, listPrinters, testPrint } from './printer';
import { getConfig, setConfig } from './config';
import { initAutoUpdater, checkForUpdatesManual, installUpdate, stopUpdater } from './updater';

const PDV_URL = getConfig('pdvUrl') || 'https://start-a-new-quest.lovable.app/pos';

let mainWindow: BrowserWindow | null = null;

function getMainWindow() {
  return mainWindow;
}

function createWindow() {
  const kiosk = getConfig('kiosk') === true;

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    fullscreen: kiosk,
    kiosk,
    title: 'FoodHub PDV',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(PDV_URL);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Arquivo',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Verificar atualizações',
          click: () => {
            checkForUpdatesManual().catch(() => {});
          },
        },
        { type: 'separator' },
        {
          label: 'Sobre FoodHub PDV',
          click: () => {
            const version = app.getVersion();
            const { dialog } = require('electron');
            dialog.showMessageBox({
              type: 'info',
              title: 'Sobre',
              message: `FoodHub PDV Desktop\nVersão ${version}`,
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC Handlers ──────────────────────────────────────────

ipcMain.handle('foodhub:isDesktop', () => true);

ipcMain.handle('foodhub:getPrinters', async () => {
  // Use Electron's native API for reliable printer listing (avoids wmic CSV parsing issues)
  if (mainWindow) {
    try {
      const printers = await mainWindow.webContents.getPrintersAsync();
      console.log(`[Printer] Electron detected ${printers.length} printer(s). Keys: ${printers.length > 0 ? Object.keys(printers[0]).join(', ') : 'none'}`);
      return printers.map(p => p.name).filter(Boolean);
    } catch (err) {
      console.error('[Printer] getPrintersAsync failed, falling back to wmic:', err);
    }
  }
  // Fallback to wmic-based listing
  return listPrinters();
});

ipcMain.handle('foodhub:getDefaultPrinter', async () => {
  // Try Electron native first to find OS default
  if (mainWindow) {
    try {
      const printers = await mainWindow.webContents.getPrintersAsync();
      const osDef = printers.find(p => p.isDefault);
      if (osDef) return osDef.name;
    } catch {}
  }
  return getConfig('defaultPrinter') || null;
});

ipcMain.handle('foodhub:setDefaultPrinter', (_event, name: string) => {
  setConfig('defaultPrinter', name);
  return true;
});

ipcMain.handle('foodhub:printReceipt', async (_event, payload: {
  lines: Array<{
    type: 'text' | 'bold' | 'separator' | 'cut' | 'feed' | 'pair';
    value?: string;
    align?: 'left' | 'center' | 'right';
    left?: string;
    right?: string;
    lines?: number;
  }>;
  printerName?: string;
  paperWidth?: number;
}) => {
  const printerName = payload.printerName || getConfig('defaultPrinter') || undefined;
  const paperWidth = payload.paperWidth || 80;

  return printReceipt(payload.lines, { printerName, paperWidth });
});

ipcMain.handle('foodhub:printTest', async () => {
  const printerName = getConfig('defaultPrinter') || undefined;
  return testPrint(printerName);
});

// ─── Update IPC ────────────────────────────────────────────

ipcMain.handle('foodhub:checkForUpdates', () => {
  return checkForUpdatesManual();
});

ipcMain.handle('foodhub:installUpdate', () => {
  installUpdate();
});

// ─── App lifecycle ─────────────────────────────────────────

app.whenReady().then(() => {
  // Inject foodhub marker into user-agent so the web app can detect desktop
  const ua = session.defaultSession.getUserAgent();
  session.defaultSession.setUserAgent(`${ua} FoodHubPDV/1.0`);

  buildMenu();
  createWindow();
  initAutoUpdater(getMainWindow);
});

app.on('window-all-closed', () => {
  stopUpdater();
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
