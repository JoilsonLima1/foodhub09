// FoodHub PDV Desktop - Auto Updater via GitHub Releases
import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow, dialog, Notification } from 'electron';
import log from 'electron-log';

// Configure logging
autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = 'info';

// Auto-download but don't auto-install — prompt user to restart
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
let checkTimer: NodeJS.Timeout | null = null;
let progressWindow: BrowserWindow | null = null;

function sendStatus(win: BrowserWindow | null, status: string, data?: any) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('foodhub:updateStatus', { status, ...data });
  }
}

function showProgressWindow(parentWin: BrowserWindow | null) {
  if (progressWindow && !progressWindow.isDestroyed()) return;

  progressWindow = new BrowserWindow({
    width: 420,
    height: 160,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    frame: true,
    title: 'Atualizando FoodHub PDV',
    parent: parentWin || undefined,
    modal: !!parentWin,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  progressWindow.setMenu(null);
  progressWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: #1a1a2e; color: #eee; display: flex; flex-direction: column; justify-content: center; }
        h3 { margin: 0 0 12px 0; font-size: 15px; color: #fff; }
        .bar-bg { background: #333; border-radius: 6px; height: 22px; overflow: hidden; }
        .bar-fill { background: linear-gradient(90deg, #f97316, #fb923c); height: 100%; width: 0%; transition: width 0.3s; border-radius: 6px; }
        .status { margin-top: 10px; font-size: 13px; color: #aaa; }
      </style>
    </head>
    <body>
      <h3>⬇️ Baixando atualização...</h3>
      <div class="bar-bg"><div class="bar-fill" id="bar"></div></div>
      <div class="status" id="status">Iniciando download...</div>
      <script>
        window.updateProgress = function(percent) {
          document.getElementById('bar').style.width = percent + '%';
          document.getElementById('status').textContent = 'Baixando... ' + percent + '%';
        };
        window.updateDone = function(version) {
          document.getElementById('bar').style.width = '100%';
          document.getElementById('status').textContent = 'Download completo! Versão ' + version + ' — reinicie para instalar.';
          document.querySelector('h3').textContent = '✅ Atualização pronta!';
        };
      </script>
    </body>
    </html>
  `)}`);

  progressWindow.on('closed', () => { progressWindow = null; });
}

function updateProgressBar(percent: number) {
  if (progressWindow && !progressWindow.isDestroyed()) {
    progressWindow.webContents.executeJavaScript(`window.updateProgress(${percent})`).catch(() => {});
  }
}

function closeProgressWindow() {
  if (progressWindow && !progressWindow.isDestroyed()) {
    progressWindow.destroy();
    progressWindow = null;
  }
}

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null) {
  autoUpdater.on('checking-for-update', () => {
    log.info('[Updater] Checking for update...');
    sendStatus(getMainWindow(), 'checking');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info('[Updater] Update available:', info.version);
    sendStatus(getMainWindow(), 'available', { version: info.version });
    // Show progress window for download
    showProgressWindow(getMainWindow());
  });

  autoUpdater.on('update-not-available', () => {
    log.info('[Updater] No update available.');
    sendStatus(getMainWindow(), 'not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent);
    log.info(`[Updater] Download: ${pct}%`);
    sendStatus(getMainWindow(), 'downloading', { percent: pct });
    updateProgressBar(pct);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info('[Updater] Update downloaded:', info.version);
    sendStatus(getMainWindow(), 'downloaded', { version: info.version });
    closeProgressWindow();

    // Show restart prompt
    const win = getMainWindow();
    const response = dialog.showMessageBoxSync(win || ({} as any), {
      type: 'info',
      title: 'Atualização pronta!',
      message: `A versão ${info.version} foi baixada com sucesso.\n\nDeseja reiniciar agora para aplicar a atualização?`,
      buttons: ['Reiniciar agora', 'Mais tarde'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      autoUpdater.quitAndInstall(false, true);
    } else {
      // Show notification as reminder
      if (Notification.isSupported()) {
        new Notification({
          title: 'FoodHub PDV',
          body: `Versão ${info.version} pronta. Reinicie o app para instalar.`,
        }).show();
      }
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('[Updater] Error:', err);
    sendStatus(getMainWindow(), 'error', { message: err?.message || String(err) });
    closeProgressWindow();
  });

  // Initial check (delay 10s to let app settle)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('[Updater] Initial check failed:', err);
    });
  }, 10_000);

  // Periodic check
  checkTimer = setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('[Updater] Periodic check failed:', err);
    });
  }, CHECK_INTERVAL_MS);
}

export async function checkForUpdatesManual(): Promise<{ status: 'available' | 'not-available' | 'error'; version?: string; message?: string }> {
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo && result.updateInfo.version) {
      const currentVersion = require('electron').app.getVersion();
      if (result.updateInfo.version !== currentVersion) {
        return { status: 'available', version: result.updateInfo.version };
      }
    }
    return { status: 'not-available' };
  } catch (err: any) {
    log.error('[Updater] Manual check failed:', err);
    return { status: 'error', message: err?.message || String(err) };
  }
}

export function installUpdate() {
  autoUpdater.quitAndInstall(false, true);
}

export function stopUpdater() {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
}
