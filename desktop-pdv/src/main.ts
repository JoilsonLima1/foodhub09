import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { printReceipt, listPrinters, testPrint } from './printer';
import { getConfig, setConfig } from './config';

const PDV_URL = getConfig('pdvUrl') || 'https://start-a-new-quest.lovable.app/pos';

let mainWindow: BrowserWindow | null = null;

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

// ─── IPC Handlers ──────────────────────────────────────────

ipcMain.handle('foodhub:isDesktop', () => true);

ipcMain.handle('foodhub:getPrinters', async () => {
  return listPrinters();
});

ipcMain.handle('foodhub:getDefaultPrinter', () => {
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

// ─── App lifecycle ─────────────────────────────────────────

app.whenReady().then(() => {
  // Inject foodhub marker into user-agent so the web app can detect desktop
  const ua = session.defaultSession.getUserAgent();
  session.defaultSession.setUserAgent(`${ua} FoodHubPDV/1.0`);

  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
