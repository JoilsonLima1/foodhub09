import express from 'express';
import { loadConfig } from './config';
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
  if (!origin) return true; // same-origin / non-browser
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow any *.lovable.app preview
  if (/^https:\/\/.*\.lovable\.app$/.test(origin)) return true;
  // Allow localhost/127.0.0.1 for dev
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
app.use('/', printersRouter());
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

const port = config.port;
app.listen(port, '0.0.0.0', () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  FoodHub Print Agent v${config.version}            ║`);
  console.log(`  ║  Rodando em http://localhost:${port}        ║`);
  console.log(`  ║  Pronto para impressão 1-clique!         ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
