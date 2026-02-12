import { app, BrowserWindow, ipcMain, session, Menu } from 'electron';
import path from 'path';
import { printReceipt, listPrinters, testPrint } from './printer';
import { getConfig, setConfig } from './config';
import { initAutoUpdater, checkForUpdatesManual, installUpdate, stopUpdater } from './updater';

const DEFAULT_PDV_URL = 'https://start-a-new-quest.lovable.app/pos';
const PDV_URL = getConfig('pdvUrl') || DEFAULT_PDV_URL;

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
          click: async () => {
            const { dialog } = require('electron');
            try {
              const result = await checkForUpdatesManual();
              if (result.status === 'available') {
                dialog.showMessageBox({
                  type: 'info',
                  title: 'Atualização disponível',
                  message: `Uma nova versão (${result.version}) está disponível e será baixada automaticamente.`,
                });
              } else if (result.status === 'not-available') {
                dialog.showMessageBox({
                  type: 'info',
                  title: 'Sistema atualizado',
                  message: `Seu sistema já está atualizado com a última versão (${app.getVersion()}).\nQuando houver uma nova versão, você será avisado automaticamente.`,
                });
              } else {
                dialog.showMessageBox({
                  type: 'warning',
                  title: 'Erro ao verificar',
                  message: `Não foi possível verificar atualizações.\n${result.message || 'Tente novamente mais tarde.'}`,
                });
              }
            } catch {
              const { dialog: d } = require('electron');
              d.showMessageBox({ type: 'error', title: 'Erro', message: 'Falha ao verificar atualizações.' });
            }
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
  // Virtual printers that should be hidden from the user
  const VIRTUAL_PRINTERS = ['fax', 'onenote', 'xps document writer', 'send to onenote', 'print to pdf', 'microsoft print', 'pdf'];

  if (mainWindow) {
    try {
      const printers = await mainWindow.webContents.getPrintersAsync();
      const filtered = printers
        .map(p => p.name)
        .filter(name => {
          if (!name) return false;
          const lower = name.toLowerCase();
          return !VIRTUAL_PRINTERS.some(v => lower.includes(v));
        });
      console.log(`[Printer] Electron detected ${printers.length} printer(s), ${filtered.length} after filtering virtual.`);
      return filtered;
    } catch (err) {
      console.error('[Printer] getPrintersAsync failed, falling back to wmic:', err);
    }
  }
  return listPrinters();
});

ipcMain.handle('foodhub:getDefaultPrinter', async () => {
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
  try {
    // If printerName is explicitly null → use OS default (no config fallback)
    // If printerName is undefined (not provided) → fall back to config
    const hasExplicitPrinter = 'printerName' in payload && payload.printerName !== undefined;
    const printerName = hasExplicitPrinter
      ? (payload.printerName || undefined)   // null → undefined (OS default)
      : (getConfig('defaultPrinter') || undefined);
    const paperWidth = payload.paperWidth || 80;
    console.log(`[IPC] foodhub:printReceipt received, payload.printerName=${JSON.stringify(payload.printerName)}, resolved="${printerName || '(OS default)'}", lines=${payload.lines?.length || 0}`);
    return await printReceipt(payload.lines, { printerName, paperWidth });
  } catch (err: any) {
    console.error('[IPC] foodhub:printReceipt uncaught error:', err);
    return { ok: false, jobId: `err_${Date.now()}`, error: { code: 'INTERNAL_ERROR', message: err.message || String(err) } };
  }
});

ipcMain.handle('foodhub:printTest', async () => {
  try {
    console.log('[IPC] foodhub:printTest received (uses config default)');
    const printerName = getConfig('defaultPrinter') || undefined;
    console.log(`[IPC] printTest resolved printer: "${printerName || '(OS default)'}"`);
    return await testPrint(printerName);
  } catch (err: any) {
    console.error('[IPC] foodhub:printTest uncaught error:', err);
    return { ok: false, jobId: `err_${Date.now()}`, error: { code: 'INTERNAL_ERROR', message: err.message || String(err) } };
  }
});

// ─── Status/Diagnostic IPC ─────────────────────────────────

ipcMain.handle('foodhub:getStatus', async () => {
  let printersCount = 0;
  let defaultPrinterName: string | null = null;

  if (mainWindow) {
    try {
      const printers = await mainWindow.webContents.getPrintersAsync();
      printersCount = printers.length;
      const def = printers.find(p => p.isDefault);
      if (def) defaultPrinterName = def.name;
    } catch {}
  }

  return {
    ok: true,
    appVersion: app.getVersion(),
    printersCount,
    defaultPrinterName,
  };
});

// ─── Update IPC ────────────────────────────────────────────

ipcMain.handle('foodhub:checkForUpdates', async () => {
  return checkForUpdatesManual();
});

ipcMain.handle('foodhub:installUpdate', () => {
  installUpdate();
});

// ─── App lifecycle ─────────────────────────────────────────

app.whenReady().then(() => {
  const ua = session.defaultSession.getUserAgent();
  session.defaultSession.setUserAgent(`${ua} FoodHubPDV/${app.getVersion()}`);

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
