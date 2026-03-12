/** Type declarations for the FoodHub PDV Desktop bridge (Electron preload) */

interface FoodHubReceiptLine {
  type: 'text' | 'bold' | 'separator' | 'cut' | 'feed' | 'pair';
  value?: string;
  align?: 'left' | 'center' | 'right';
  left?: string;
  right?: string;
  lines?: number;
}

interface FoodHubPrintResult {
  ok: boolean;
  jobId?: string;
  error?: {
    code: 'NO_DEFAULT_PRINTER' | 'PRINTER_NOT_FOUND' | 'PRINT_FAILED' | 'INTERNAL_ERROR' | string;
    message: string;
  };
}

interface FoodHubStatus {
  ok: boolean;
  appVersion: string;
  printersCount: number;
  defaultPrinterName: string | null;
}

interface FoodHubBridge {
  isDesktop: () => Promise<boolean>;
  getPrinters: () => Promise<string[]>;
  getDefaultPrinter: () => Promise<string | null>;
  setDefaultPrinter: (name: string) => Promise<boolean>;
  printReceipt: (payload: {
    lines: FoodHubReceiptLine[];
    printerName?: string | null;
    paperWidth?: number;
    silent?: boolean;
    useDefaultPrinter?: boolean;
  }) => Promise<FoodHubPrintResult>;
  printTest: () => Promise<FoodHubPrintResult>;
  getStatus: () => Promise<FoodHubStatus>;
}

declare global {
  interface Window {
    foodhub?: FoodHubBridge;
  }
}

export {};
