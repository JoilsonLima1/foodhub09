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

function createPrinter(printerName?: string, paperWidth = 80): ThermalPrinter {
  // Use Windows spooler interface (printer:NAME)
  const iface = printerName ? `printer:${printerName}` : 'printer:auto';

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
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return {
        ok: false,
        error: `PRINTER_NOT_FOUND: "${printerName || 'auto'}" não está acessível.`,
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
    console.error('[Printer] ESC/POS error:', err);
    return {
      ok: false,
      error: `PRINT_ERROR: ${err.message || String(err)}`,
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
