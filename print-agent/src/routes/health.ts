import { Router } from 'express';
import type { AgentConfig } from '../config';

export function healthRouter(config: AgentConfig) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      version: config.version,
      port: config.port,
      platform: process.platform,
      uptime: Math.floor(process.uptime()),
    });
  });

  // Alias for backwards compatibility
  router.get('/status', (_req, res) => {
    res.json({ ok: true, version: config.version });
  });

  // Ping for quick connectivity check
  router.get('/ping', (_req, res) => {
    res.json({ pong: true });
  });

  return router;
}
