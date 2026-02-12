import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';

interface ReceiptLine {
  type: 'text' | 'bold' | 'separator' | 'cut' | 'feed' | 'pair';
  value?: string;
  align?: 'left' | 'center' | 'right';
  left?: string;
  right?: string;
  lines?: number;
}

interface PrintOptions {
  printerName?: string;
  paperWidth?: number;
}

/** Standard error codes returned to the frontend */
export type PrintErrorCode =
  | 'PRINTER_NOT_CONFIGURED'
  | 'PRINTER_NOT_FOUND'
  | 'NO_DRIVER_SET'
  | 'PRINT_FAILED'
  | 'INTERNAL_ERROR';

export interface PrintResult {
  ok: boolean;
  jobId: string;
  error?: { code: PrintErrorCode; message: string };
}

function generateJobId(): string {
  // Simple unique id without external deps
  return `pj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultPrinterName(): string | undefined {
  try {
    const { execSync } = require('child_process');
    const output = execSync(
      'powershell -Command "Get-CimInstance Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object -ExpandProperty Name"',
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    if (output) return output;
  } catch {}
  return undefined;
}

function getPrinterPort(printerName: string): string | undefined {
  try {
    const { execSync } = require('child_process');
    const output = execSync(
      `powershell -Command "Get-Printer -Name '${printerName.replace(/'/g, "''")}' | Select-Object -ExpandProperty PortName"`,
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    if (output) {
      console.log(`[Printer] Port for "${printerName}": ${output}`);
      return output;
    }
  } catch (err) {
    console.error(`[Printer] Failed to get port for "${printerName}":`, err);
  }
  return undefined;
}

function createPrinter(printerName?: string, paperWidth = 80): { printer: ThermalPrinter; resolvedName: string | undefined } {
  let resolvedName = printerName;
  if (!resolvedName) {
    resolvedName = getDefaultPrinterName();
    console.log(`[Printer] No explicit printer, OS default: "${resolvedName || 'none'}"`);
  }

  const iface = resolvedName ? `printer:${resolvedName}` : undefined;
  console.log(`[Printer] Creating printer with interface: "${iface || 'none'}", width: ${paperWidth}`);

  if (!iface) {
    throw { code: 'PRINTER_NOT_CONFIGURED' as PrintErrorCode, message: 'Nenhuma impressora encontrada. Configure uma impressora no Windows.' };
  }

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: iface,
    characterSet: CharacterSet.PC860_PORTUGUESE,
    removeSpecialCharacters: false,
    width: paperWidth === 58 ? 32 : 48,
    options: {
      timeout: 10000,
    },
  });

  return { printer, resolvedName };
}

function applyAlign(printer: ThermalPrinter, align?: string) {
  switch (align) {
    case 'center': printer.alignCenter(); break;
    case 'right': printer.alignRight(); break;
    default: printer.alignLeft(); break;
  }
}

function printPair(printer: ThermalPrinter, left: string, right: string, cols: number) {
  const spacing = cols - left.length - right.length;
  if (spacing > 0) {
    printer.println(left + ' '.repeat(spacing) + right);
  } else {
    printer.println(`${left} ${right}`);
  }
}

export async function printReceipt(
  lines: ReceiptLine[],
  options: PrintOptions = {}
): Promise<PrintResult> {
  const jobId = generateJobId();
  const { printerName, paperWidth = 80 } = options;

  console.log(`[PRINT_REQUEST] jobId=${jobId}, printerName="${printerName || '(default)'}", paperWidth=${paperWidth}, linesCount=${lines.length}, ts=${new Date().toISOString()}`);

  let resolvedName: string | undefined;
  let printer: ThermalPrinter;

  try {
    const created = createPrinter(printerName, paperWidth);
    printer = created.printer;
    resolvedName = created.resolvedName;
  } catch (err: any) {
    // Structured error from createPrinter
    if (err.code) {
      console.log(`[PRINT_RESULT] jobId=${jobId}, ok=false, code=${err.code}`);
      return { ok: false, jobId, error: { code: err.code, message: err.message } };
    }
    console.log(`[PRINT_RESULT] jobId=${jobId}, ok=false, code=INTERNAL_ERROR`);
    return { ok: false, jobId, error: { code: 'INTERNAL_ERROR', message: err.message || String(err) } };
  }

  const cols = paperWidth === 58 ? 32 : 48;

  try {
    // NOTE: isPrinterConnected() is unreliable for Windows printer: interfaces
    // (often returns false even when the printer works fine).
    // We skip the check and let execute() fail naturally if the printer is unavailable.
    console.log(`[Printer] Skipping isPrinterConnected (unreliable on Windows), will try execute directly for "${resolvedName}"`);

    // Build ESC/POS data
    for (const line of lines) {
      switch (line.type) {
        case 'text':
          applyAlign(printer, line.align);
          printer.println(line.value || '');
          break;
        case 'bold':
          applyAlign(printer, line.align);
          printer.bold(true);
          printer.println(line.value || '');
          printer.bold(false);
          break;
        case 'separator':
          printer.drawLine();
          break;
        case 'pair':
          printer.alignLeft();
          printPair(printer, line.left || '', line.right || '', cols);
          break;
        case 'feed':
          printer.newLine();
          for (let i = 1; i < (line.lines || 1); i++) {
            printer.newLine();
          }
          break;
        case 'cut':
          printer.cut();
          break;
      }
    }

    printer.alignLeft();

    // Try execute() first (uses node-thermal-printer's native printer module)
    console.log(`[Printer] About to execute() for "${resolvedName}"...`);
    try {
      await printer.execute();
      console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${resolvedName}" (native)`);
      return { ok: true, jobId };
    } catch (nativeErr: any) {
      console.warn(`[Printer] Native execute() failed: ${nativeErr.message}. Trying raw port fallback...`);
    }

    // FALLBACK: Get raw ESC/POS buffer and write directly to printer port via PowerShell
    const rawBuffer = printer.getBuffer();
    if (rawBuffer && rawBuffer.length > 0 && resolvedName) {
      const portName = getPrinterPort(resolvedName);
      if (portName) {
        try {
          const fs = require('fs');
          const os = require('os');
          const path = require('path');
          const { execSync } = require('child_process');
          
          // Write buffer to temp file
          const tmpFile = path.join(os.tmpdir(), `foodhub_print_${jobId}.bin`);
          fs.writeFileSync(tmpFile, rawBuffer);
          console.log(`[Printer] Raw buffer ${rawBuffer.length} bytes written to ${tmpFile}`);
          
          // Send raw file to printer via PowerShell (most reliable on Windows)
          const cmd = `powershell -Command "Copy-Item -LiteralPath '${tmpFile}' -Destination '\\\\localhost\\${resolvedName.replace(/'/g, "''")}' -Force"`;
          console.log(`[Printer] Trying Copy-Item to share...`);
          
          try {
            execSync(cmd, { timeout: 15000 });
            console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${resolvedName}" (share)`);
            try { fs.unlinkSync(tmpFile); } catch {}
            return { ok: true, jobId };
          } catch {
            // If share doesn't work, try direct port write
            console.log(`[Printer] Share failed, trying direct port write to ${portName}...`);
            try {
              const portPath = portName.startsWith('\\\\') ? portName : `\\\\.\\${portName}`;
              fs.writeFileSync(portPath, rawBuffer);
              console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${resolvedName}" (port:${portName})`);
              try { fs.unlinkSync(tmpFile); } catch {}
              return { ok: true, jobId };
            } catch (portErr: any) {
              console.error(`[Printer] Direct port write also failed:`, portErr.message);
            }
          }
          
          try { fs.unlinkSync(tmpFile); } catch {}
        } catch (fallbackErr: any) {
          console.error(`[Printer] Raw fallback failed:`, fallbackErr.message);
        }
      }
    }

    // All methods failed
    throw new Error(`Falha ao imprimir em "${resolvedName}". Verifique se a impressora está ligada e o driver "Generic / Text Only" está instalado.`);
  } catch (err: any) {
    const msg = err.message || String(err);
    console.error(`[Printer] ESC/POS error for "${resolvedName || 'padrão'}": ${msg}`);
    console.error(`[Printer] Full error:`, err);

    let code: PrintErrorCode = 'PRINT_FAILED';
    let message = msg;

    if (msg.includes('No driver set') || msg.includes('no driver')) {
      code = 'NO_DRIVER_SET';
      message = `Driver da impressora "${resolvedName || 'padrão'}" não encontrado. Verifique se o driver "Generic / Text Only" está instalado.`;
    } else if (msg.includes('ENOENT') || msg.includes('not found')) {
      code = 'PRINTER_NOT_FOUND';
      message = `Impressora "${resolvedName || 'padrão'}" não encontrada no sistema. Verifique se está ligada e conectada.`;
    } else if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      code = 'PRINT_FAILED';
      message = `Tempo esgotado ao tentar imprimir em "${resolvedName || 'padrão'}". Verifique se a impressora está ligada.`;
    }

    console.log(`[PRINT_RESULT] jobId=${jobId}, ok=false, code=${code}`);
    return { ok: false, jobId, error: { code, message } };
  }
}

export async function listPrinters(): Promise<string[]> {
  try {
    const { execSync } = require('child_process');
    const output = execSync('wmic printer list brief /format:csv', {
      encoding: 'utf-8',
      timeout: 5000,
    });

    const lines = output.split('\n').filter(Boolean);
    const names: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length >= 2 && cols[1]?.trim()) {
        names.push(cols[1].trim());
      }
    }
    return names;
  } catch (err) {
    console.error('[Printer] Failed to list printers:', err);
    return [];
  }
}

export async function testPrint(printerName?: string): Promise<PrintResult> {
  const testLines: ReceiptLine[] = [
    { type: 'bold', value: 'FoodHub PDV Desktop', align: 'center' },
    { type: 'separator' },
    { type: 'text', value: 'Teste de impressão ESC/POS', align: 'center' },
    { type: 'pair', left: 'Data:', right: new Date().toLocaleString('pt-BR') },
    { type: 'pair', left: 'Impressora:', right: printerName || 'Padrão do sistema' },
    { type: 'separator' },
    { type: 'text', value: '✓ Impressora funcionando!', align: 'center' },
    { type: 'feed', lines: 3 },
    { type: 'cut' },
  ];

  return printReceipt(testLines, { printerName });
}
