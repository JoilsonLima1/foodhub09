import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import { loadConfig } from './config';
import { ensureCertificates } from './cert-manager';
import { healthRouter } from './routes/health';
import { printersRouter } from './routes/printers';
import { printRouter } from './routes/print';

const config = loadConfig();
const app = express();

// ----- CORS + Private Network Access (PNA) -----
const ALLOWED_ORIGINS = [
  'https://foodhub09.com.br',
  'https://www.foodhub09.com.br',
  'https://start-a-new-quest.lovable.app',
];

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https:\/\/.*\.lovable\.app$/.test(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Private Network Access (PNA) — Chrome 104+
  if (req.headers['access-control-request-private-network'] === 'true') {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

app.use(express.json({ limit: '2mb' }));

// Routes
app.use('/', healthRouter(config));
app.use('/', printersRouter(config));
app.use('/', printRouter(config));

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Agent Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal error' });
});

// ----- Start servers -----
const HTTPS_PORT = config.port; // 8123
const HTTP_PORT = config.port + 1; // 8124 (debug only)

// Try HTTPS
const certs = ensureCertificates(config.configDir);

if (certs.exists) {
  const tlsOptions = {
    cert: fs.readFileSync(certs.certFile),
    key: fs.readFileSync(certs.keyFile),
  };

  https.createServer(tlsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║  FoodHub Print Agent v${config.version}            ║`);
    console.log(`  ║  Modo: ESC/POS via Spooler              ║`);
    console.log(`  ║  HTTPS: https://127.0.0.1:${HTTPS_PORT}       ║`);
    console.log(`  ║  HTTP debug: http://127.0.0.1:${HTTP_PORT}    ║`);
    console.log(`  ║  Pronto para impressão térmica!          ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
  });
} else {
  // Fallback: HTTP only if certs could not be generated
  console.warn('[WARN] HTTPS indisponível — rodando somente HTTP.');
}

// Always start HTTP on debug port
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
  if (!certs.exists) {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║  FoodHub Print Agent v${config.version}            ║`);
    console.log(`  ║  ⚠ Somente HTTP (sem certificado)       ║`);
    console.log(`  ║  HTTP: http://127.0.0.1:${HTTP_PORT}          ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
  } else {
    console.log(`  [HTTP Debug] http://127.0.0.1:${HTTP_PORT}`);
  }
});
