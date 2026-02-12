/** Type declarations for the FoodHub update bridge (Electron preload) */

interface FoodHubUpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  message?: string;
}

interface FoodHubUpdatesBridge {
  onStatus: (callback: (data: FoodHubUpdateStatus) => void) => void;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

declare global {
  interface Window {
    foodhubUpdates?: FoodHubUpdatesBridge;
  }
}

export type { FoodHubUpdatesBridge, FoodHubUpdateStatus };
