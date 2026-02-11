import {
  printer as ThermalPrinter,
  types as PrinterTypes,
} from 'node-thermal-printer';

export interface ReceiptLine {
  type: 'text' | 'bold' | 'separator' | 'cut' | 'feed' | 'pair';
  value?: string;
  align?: 'left' | 'center' | 'right';
  /** For type 'pair': left + right columns */
  left?: string;
  right?: string;
  /** Number of line feeds (for type 'feed') */
  lines?: number;
}

export interface PrintJob {
  printerName?: string;
  paperWidth?: 58 | 80;
  lines: ReceiptLine[];
}

/**
 * Send ESC/POS raw commands to a Windows-installed printer via the print spooler.
 * No Puppeteer, no Chrome, no PDF — pure thermal.
 */
export async function printEscPos(job: PrintJob): Promise<void> {
  const pw = job.paperWidth === 58 ? 58 : 80;
  const charsPerLine = pw === 58 ? 32 : 48;

  const tp = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: job.printerName
      ? `printer:${job.printerName}`
      : 'printer:auto',
    characterSet: 'CHARCODE_LATIN1',
    removeSpecialCharacters: false,
    width: charsPerLine,
    options: {
      timeout: 10000,
    },
  });

  // Check connectivity
  const isConnected = await tp.isPrinterConnected();
  if (!isConnected) {
    throw new Error(
      job.printerName
        ? `Impressora "${job.printerName}" não está acessível via spooler.`
        : 'Nenhuma impressora padrão acessível via spooler.'
    );
  }

  // Process each line
  for (const line of job.lines) {
    switch (line.type) {
      case 'text':
        setAlign(tp, line.align);
        tp.println(line.value || '');
        break;

      case 'bold':
        setAlign(tp, line.align);
        tp.bold(true);
        tp.println(line.value || '');
        tp.bold(false);
        break;

      case 'pair': {
        // Left-right pair on same line
        const left = line.left || '';
        const right = line.right || '';
        const spaces = charsPerLine - left.length - right.length;
        tp.alignLeft();
        tp.print(left + ' '.repeat(Math.max(1, spaces)) + right);
        tp.newLine();
        break;
      }

      case 'separator':
        tp.drawLine();
        break;

      case 'feed':
        for (let i = 0; i < (line.lines || 1); i++) {
          tp.newLine();
        }
        break;

      case 'cut':
        tp.cut();
        break;

      default:
        break;
    }
  }

  // Execute print
  await tp.execute();

  console.log(
    `[ESC/POS] ✓ Impresso em ${job.printerName || 'impressora padrão'} (${pw}mm, ${job.lines.length} linhas)`
  );
}

function setAlign(tp: InstanceType<typeof ThermalPrinter>, align?: string) {
  switch (align) {
    case 'center':
      tp.alignCenter();
      break;
    case 'right':
      tp.alignRight();
      break;
    default:
      tp.alignLeft();
      break;
  }
}
