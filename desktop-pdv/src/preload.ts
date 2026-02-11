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
});
