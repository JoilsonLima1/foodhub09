// FoodHub PDV Desktop Configuration
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'FoodHubPDV'
);
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface AppConfig {
  defaultPrinter?: string;
  pdvUrl?: string;
  kiosk?: boolean;
  paperWidth?: number;
  [key: string]: unknown;
}

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[Config] Failed to load:', err);
  }
  return {};
}

function saveConfig(config: AppConfig) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getConfig<K extends keyof AppConfig>(key: K): AppConfig[K] {
  return loadConfig()[key];
}

export function setConfig<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

export function getAllConfig(): AppConfig {
  return loadConfig();
}
