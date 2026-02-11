import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import type { AgentConfig } from '../config';

const execAsync = promisify(exec);

async function getDefaultPrinterName(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      'wmic printer where Default="TRUE" get Name',
      { timeout: 5000 }
    );
    const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) return lines[1];
  } catch {}

  try {
    const { stdout } = await execAsync(
      'powershell -Command "Get-CimInstance -ClassName Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object -ExpandProperty Name"',
      { timeout: 5000 }
    );
    const name = stdout.trim();
    if (name) return name;
  } catch {}

  return null;
}

async function listWindowsPrinterNames(): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      'powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"',
      { timeout: 5000 }
    );
    if (!stdout.trim()) return [];
    const raw = JSON.parse(stdout);
    const printers = Array.isArray(raw) ? raw : [raw];
    return printers.map((p: { Name: string }) => p.Name).sort();
  } catch {
    return [];
  }
}

export function printersRouter(config: AgentConfig) {
  const router = Router();

  // GET /printers — list installed printers
  router.get('/printers', async (_req, res) => {
    try {
      const printers = await listWindowsPrinterNames();
      const systemDefault = await getDefaultPrinterName();
      res.json({
        ok: true,
        printers,
        defaultPrinter: config.defaultPrinter || systemDefault || null,
        systemDefault,
        count: printers.length,
      });
    } catch (err) {
      res.json({
        ok: true,
        printers: [],
        defaultPrinter: null,
        count: 0,
        error: (err as Error).message,
      });
    }
  });

  // GET /impressoras — alias PT-BR
  router.get('/impressoras', async (_req, res) => {
    try {
      const printers = await listWindowsPrinterNames();
      const systemDefault = await getDefaultPrinterName();
      res.json({
        ok: true,
        impressoras: printers,
        impressoraPadrao: config.defaultPrinter || systemDefault || null,
        padraDoSistema: systemDefault,
        quantidade: printers.length,
        // backward compat
        printers,
        defaultPrinter: config.defaultPrinter || systemDefault || null,
      });
    } catch (err) {
      res.json({
        ok: true,
        impressoras: [],
        impressoraPadrao: null,
        quantidade: 0,
        error: (err as Error).message,
      });
    }
  });

  // POST /printers/default — persist default printer in config
  router.post('/printers/default', async (req, res) => {
    try {
      const { printerName, nomeDaImpressora } = req.body || {};
      const name = nomeDaImpressora || printerName;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({
          ok: false,
          code: 'MISSING_PRINTER_NAME',
          message: 'Envie "printerName" no body.',
        });
      }

      // Validate printer exists
      const printers = await listWindowsPrinterNames();
      if (printers.length > 0 && !printers.includes(name)) {
        return res.status(400).json({
          ok: false,
          code: 'PRINTER_NOT_FOUND',
          message: `Impressora "${name}" não encontrada. Disponíveis: ${printers.join(', ')}`,
        });
      }

      // Persist to config
      const configFile = path.join(config.configDir, 'config.json');
      let existing: Record<string, unknown> = {};
      try {
        if (fs.existsSync(configFile)) {
          existing = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
        }
      } catch {}

      existing.defaultPrinter = name;
      fs.mkdirSync(config.configDir, { recursive: true });
      fs.writeFileSync(configFile, JSON.stringify(existing, null, 2), 'utf-8');

      // Update in-memory config
      config.defaultPrinter = name;

      res.json({
        ok: true,
        message: `Impressora padrão salva: "${name}"`,
        defaultPrinter: name,
      });
    } catch (err) {
      console.error('[Printers/Default]', err);
      res.status(500).json({
        ok: false,
        error: (err as Error).message,
      });
    }
  });

  return router;
}

export { listWindowsPrinterNames };
