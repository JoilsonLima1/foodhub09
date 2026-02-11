import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PrinterInfo {
  name: string;
  isDefault: boolean;
}

async function listWindowsPrinters(): Promise<PrinterInfo[]> {
  try {
    const { stdout } = await execAsync(
      'powershell -Command "Get-Printer | Select-Object Name, Default | ConvertTo-Json"',
      { timeout: 5000 }
    );

    if (!stdout.trim()) return [];

    const raw = JSON.parse(stdout);
    const printers = Array.isArray(raw) ? raw : [raw];

    return printers.map((p: { Name: string; Default?: boolean }) => ({
      name: p.Name,
      isDefault: !!p.Default,
    }));
  } catch (err) {
    console.warn('[Printers] Failed to list printers:', err);
    return [];
  }
}

export function printersRouter() {
  const router = Router();

  router.get('/printers', async (_req, res) => {
    try {
      const printers = await listWindowsPrinters();
      const defaultPrinter = printers.find(p => p.isDefault)?.name || null;
      res.json({
        ok: true,
        defaultPrinter,
        printers: printers.map(p => p.name),
      });
    } catch (err) {
      res.json({
        ok: true,
        defaultPrinter: null,
        printers: [],
        error: (err as Error).message,
      });
    }
  });

  return router;
}
