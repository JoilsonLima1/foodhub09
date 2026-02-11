import express from 'express';
import cors from 'cors';
import { loadConfig } from './config';
import { healthRouter } from './routes/health';
import { printersRouter } from './routes/printers';
import { printRouter } from './routes/print';

const config = loadConfig();
const app = express();

app.use(cors());
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
