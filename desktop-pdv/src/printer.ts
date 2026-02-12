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

function createPrinter(printerName?: string, paperWidth = 80): ThermalPrinter {
  // Resolve printer name: explicit → OS default → undefined (let library decide)
  let resolvedName = printerName;
  if (!resolvedName) {
    resolvedName = getDefaultPrinterName();
    console.log(`[Printer] No explicit printer, OS default: "${resolvedName || 'none'}"`);
  }

  const iface = resolvedName ? `printer:${resolvedName}` : undefined;
  console.log(`[Printer] Creating printer with interface: "${iface || 'none'}", width: ${paperWidth}`);

  if (!iface) {
    throw new Error('PRINTER_NOT_CONFIGURED: Nenhuma impressora encontrada. Configure uma impressora no Windows.');
  }

  return new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: iface,
    characterSet: CharacterSet.PC860_PORTUGUESE,
    removeSpecialCharacters: false,
    width: paperWidth === 58 ? 32 : 48,
    options: {
      timeout: 10000,
    },
  });
}

function applyAlign(printer: ThermalPrinter, align?: string) {
  switch (align) {
    case 'center':
      printer.alignCenter();
      break;
    case 'right':
      printer.alignRight();
      break;
    default:
      printer.alignLeft();
      break;
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
): Promise<{ ok: boolean; error?: string }> {
  const { printerName, paperWidth = 80 } = options;
  const printer = createPrinter(printerName, paperWidth);
  const cols = paperWidth === 58 ? 32 : 48;

  try {
    let isConnected = false;
    try {
      isConnected = await printer.isPrinterConnected();
    } catch (connErr: any) {
      console.error('[Printer] isPrinterConnected error:', connErr);
      // Some drivers throw instead of returning false — treat as not connected
      return {
        ok: false,
        error: `PRINTER_NOT_FOUND: "${printerName || 'padrão'}" — driver não encontrado. Verifique se a impressora está instalada no Windows (Painel de Controle → Impressoras).`,
      };
    }
    if (!isConnected) {
      return {
        ok: false,
        error: `PRINTER_NOT_FOUND: "${printerName || 'padrão'}" não está acessível. Verifique se está ligada e conectada.`,
      };
    }

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
    await printer.execute();

    return { ok: true };
  } catch (err: any) {
    const msg = err.message || String(err);
    console.error('[Printer] ESC/POS error:', msg);

    // Map common native errors to user-friendly messages
    if (msg.includes('No driver set') || msg.includes('no driver')) {
      return {
        ok: false,
        error: `PRINTER_DRIVER_ERROR: Driver da impressora "${printerName || 'padrão'}" não encontrado. Verifique no Painel de Controle → Dispositivos e Impressoras se a impressora está instalada corretamente com driver "Generic / Text Only".`,
      };
    }

    return {
      ok: false,
      error: `PRINT_ERROR: ${msg}`,
    };
  }
}

export async function listPrinters(): Promise<string[]> {
  // node-thermal-printer doesn't provide printer listing natively.
  // We use a simple Windows wmic call.
  try {
    const { execSync } = require('child_process');
    const output = execSync('wmic printer list brief /format:csv', {
      encoding: 'utf-8',
      timeout: 5000,
    });

    const lines = output.split('\n').filter(Boolean);
    // CSV header: Node,Name,... — we need the Name column
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

export async function testPrint(printerName?: string): Promise<{ ok: boolean; error?: string }> {
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
