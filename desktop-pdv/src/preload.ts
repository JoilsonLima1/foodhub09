import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('foodhub', {
  isDesktop: () => ipcRenderer.invoke('foodhub:isDesktop'),
  getPrinters: () => ipcRenderer.invoke('foodhub:getPrinters'),
  getDefaultPrinter: () => ipcRenderer.invoke('foodhub:getDefaultPrinter'),
  setDefaultPrinter: (name: string) => ipcRenderer.invoke('foodhub:setDefaultPrinter', name),
  printReceipt: (payload: {
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
  }) => ipcRenderer.invoke('foodhub:printReceipt', payload),
  printTest: () => ipcRenderer.invoke('foodhub:printTest'),
  getStatus: () => ipcRenderer.invoke('foodhub:getStatus'),
});

contextBridge.exposeInMainWorld('foodhubUpdates', {
  onStatus: (callback: (data: { status: string; version?: string; percent?: number; message?: string }) => void) => {
    ipcRenderer.on('foodhub:updateStatus', (_event, data) => callback(data));
  },
  checkForUpdates: () => ipcRenderer.invoke('foodhub:checkForUpdates'),
  installUpdate: () => ipcRenderer.invoke('foodhub:installUpdate'),
});
