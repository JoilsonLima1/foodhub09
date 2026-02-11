/** Type declarations for the FoodHub PDV Desktop bridge (Electron preload) */

interface FoodHubReceiptLine {
  type: 'text' | 'bold' | 'separator' | 'cut' | 'feed' | 'pair';
  value?: string;
  align?: 'left' | 'center' | 'right';
  left?: string;
  right?: string;
  lines?: number;
}

interface FoodHubBridge {
  isDesktop: () => Promise<boolean>;
  getPrinters: () => Promise<string[]>;
  getDefaultPrinter: () => Promise<string | null>;
  setDefaultPrinter: (name: string) => Promise<void>;
  printReceipt: (payload: {
    lines: FoodHubReceiptLine[];
    printerName?: string;
    paperWidth?: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  printTest: () => Promise<{ ok: boolean; error?: string }>;
}

declare global {
  interface Window {
    foodhub?: FoodHubBridge;
  }
}

export type { FoodHubBridge, FoodHubReceiptLine };
