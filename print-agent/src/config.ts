import fs from 'fs';
import path from 'path';
import os from 'os';

export interface AgentConfig {
  port: number;
  version: string;
  configDir: string;
  defaultPrinter: string | null;
}

function getConfigDir(): string {
  if (process.platform === 'win32') {
    const programData = process.env.ProgramData || 'C:\\ProgramData';
    return path.join(programData, 'FoodHub', 'print-agent');
  }
  return path.join(os.homedir(), '.foodhub-print-agent');
}

export function loadConfig(): AgentConfig {
  const configDir = getConfigDir();
  const configFile = path.join(configDir, 'config.json');

  const defaults: AgentConfig = {
    port: parseInt(process.env.PORT || '8123', 10),
    version: '1.0.0',
    configDir,
    defaultPrinter: null,
  };

  try {
    if (fs.existsSync(configFile)) {
      const raw = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      return {
        ...defaults,
        port: raw.port || defaults.port,
        defaultPrinter: raw.defaultPrinter || null,
      };
    }
  } catch (err) {
    console.warn('[Config] Failed to load config, using defaults:', err);
  }

  // Create config dir and default config
  try {
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configFile, JSON.stringify(defaults, null, 2), 'utf-8');
  } catch {}

  return defaults;
}
