import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PrinterInfo {
  name: string;
  isDefault: boolean;
}

async function getDefaultPrinterName(): Promise<string | null> {
  // Try wmic first (most reliable on Win10/11)
  try {
    const { stdout } = await execAsync(
      'wmic printer where Default="TRUE" get Name',
      { timeout: 5000 }
    );
    const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
    // First line is header "Name", second is the value
    if (lines.length >= 2) {
      return lines[1];
    }
  } catch { /* fallback below */ }

  // Fallback: PowerShell Get-CimInstance
  try {
    const { stdout } = await execAsync(
      'powershell -Command "Get-CimInstance -ClassName Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object -ExpandProperty Name"',
      { timeout: 5000 }
    );
    const name = stdout.trim();
    if (name) return name;
  } catch { /* ignore */ }

  return null;
}

async function listWindowsPrinters(): Promise<PrinterInfo[]> {
  try {
    const { stdout } = await execAsync(
      'powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"',
      { timeout: 5000 }
    );

    if (!stdout.trim()) return [];

    const raw = JSON.parse(stdout);
    const printers = Array.isArray(raw) ? raw : [raw];
    const defaultName = await getDefaultPrinterName();

    return printers
      .map((p: { Name: string }) => ({
        name: p.Name,
        isDefault: defaultName ? p.Name === defaultName : false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.warn('[Printers] Failed to list printers:', err);
    return [];
  }
}

export function printersRouter() {
  const router = Router();

  // GET /impressoras — Portuguese endpoint (primary)
  router.get('/impressoras', async (_req, res) => {
    try {
      const printers = await listWindowsPrinters();
      const printerNames = printers.map(p => p.name);
      const foundDefault = printers.find(p => p.isDefault)?.name || null;
      // Only return default if it's actually in the list
      const defaultPrinter = foundDefault && printerNames.includes(foundDefault) ? foundDefault : null;
      res.json({
        ok: true,
        impressoraPadrao: defaultPrinter,
        impressoras: printerNames,
        // Backward compat
        defaultPrinter,
        printers: printerNames,
      });
    } catch (err) {
      res.json({
        ok: true,
        impressoraPadrao: null,
        impressoras: [],
        defaultPrinter: null,
        printers: [],
        error: (err as Error).message,
      });
    }
  });

  // GET /printers — backward compat alias
  router.get('/printers', async (_req, res) => {
    try {
      const printers = await listWindowsPrinters();
      const printerNames = printers.map(p => p.name);
      const foundDefault = printers.find(p => p.isDefault)?.name || null;
      const defaultPrinter = foundDefault && printerNames.includes(foundDefault) ? foundDefault : null;
      res.json({
        ok: true,
        defaultPrinter,
        printers: printerNames,
        impressoraPadrao: defaultPrinter,
        impressoras: printerNames,
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

export { listWindowsPrinters };
