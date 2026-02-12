// FoodHub PDV Desktop - Auto Updater via GitHub Releases
import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

// Configure logging
autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = 'info';

// Don't auto-install on download — let user decide when to restart
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
let checkTimer: NodeJS.Timeout | null = null;

function sendStatus(win: BrowserWindow | null, status: string, data?: any) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('foodhub:updateStatus', { status, ...data });
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
  });

  autoUpdater.on('update-not-available', () => {
    log.info('[Updater] No update available.');
    sendStatus(getMainWindow(), 'not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`[Updater] Download: ${Math.round(progress.percent)}%`);
    sendStatus(getMainWindow(), 'downloading', { percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info('[Updater] Update downloaded:', info.version);
    sendStatus(getMainWindow(), 'downloaded', { version: info.version });
  });

  autoUpdater.on('error', (err) => {
    log.error('[Updater] Error:', err);
    sendStatus(getMainWindow(), 'error', { message: err?.message || String(err) });
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
