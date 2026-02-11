import { Router } from 'express';
import type { AgentConfig } from '../config';
import { listWindowsPrinterNames } from './printers';

let lastError: string | null = null;

export function setLastError(err: string) {
  lastError = err;
}

export function healthRouter(config: AgentConfig) {
  const router = Router();

  // GET /health
  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      version: config.version,
      port: config.port,
      mode: 'ESC/POS',
      platform: process.platform,
      uptime: Math.floor(process.uptime()),
    });
  });

  // GET /status — backward compat
  router.get('/status', (_req, res) => {
    res.json({ ok: true, version: config.version });
  });

  // GET /ping
  router.get('/ping', (_req, res) => {
    res.json({ pong: true });
  });

  // GET /diagnostic — full system diagnostic
  router.get('/diagnostic', async (_req, res) => {
    try {
      const printers = await listWindowsPrinterNames();
      res.json({
        ok: true,
        version: config.version,
        mode: 'ESC/POS',
        port: config.port,
        uptime: Math.floor(process.uptime()),
        printer_default: config.defaultPrinter || null,
        printers_detected_count: printers.length,
        printers_detected: printers,
        last_error: lastError,
        platform: process.platform,
        configDir: config.configDir,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: (err as Error).message,
      });
    }
  });

  return router;
}
