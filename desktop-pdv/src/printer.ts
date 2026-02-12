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

/**
 * Get the Windows port name for a printer (e.g. "USB001", "COM3", "LPT1").
 */
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

/**
 * Build ESC/POS buffer using node-thermal-printer in "buffer-only" mode.
 * We use a dummy file interface so the library never tries to load the
 * native `printer` npm module (which fails without electron-rebuild).
 */
function buildEscPosBuffer(lines: ReceiptLine[], paperWidth: number): Buffer {
  const os = require('os');
  const path = require('path');
  // Dummy file interface — we never call execute(), only getBuffer()
  const dummyPath = path.join(os.tmpdir(), `foodhub_dummy_${Date.now()}.tmp`);

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: dummyPath,
    characterSet: CharacterSet.PC860_PORTUGUESE,
    removeSpecialCharacters: false,
    width: paperWidth === 58 ? 32 : 48,
  });

  const cols = paperWidth === 58 ? 32 : 48;

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
  return printer.getBuffer();
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

/**
 * Send raw bytes to a Windows printer using multiple fallback strategies:
 * 1. Direct port write (\\.\USB001) — fastest, works for USB printers
 * 2. copy /b to port — classic Windows raw printing
 * 3. PowerShell Out-Printer as last resort
 */
function sendRawToPort(buffer: Buffer, printerName: string, portName: string, jobId: string): PrintResult {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { execSync } = require('child_process');

  const tmpFile = path.join(os.tmpdir(), `foodhub_print_${jobId}.bin`);
  fs.writeFileSync(tmpFile, buffer);
  console.log(`[Printer] Buffer ${buffer.length} bytes → ${tmpFile}`);

  // Strategy 1: Direct port write (\\.\USB001)
  try {
    const portPath = portName.startsWith('\\\\') ? portName : `\\\\.\\${portName}`;
    console.log(`[Printer] Strategy 1: Direct write to ${portPath}...`);
    fs.writeFileSync(portPath, buffer);
    console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${printerName}" (direct:${portName})`);
    try { fs.unlinkSync(tmpFile); } catch {}
    return { ok: true, jobId };
  } catch (err: any) {
    console.warn(`[Printer] Strategy 1 failed: ${err.message}`);
  }

  // Strategy 2: copy /b via cmd.exe
  try {
    // Escape the tmpFile path and printer name for cmd
    const copyCmd = `copy /b "${tmpFile}" "\\\\.\\${portName}"`;
    console.log(`[Printer] Strategy 2: ${copyCmd}`);
    execSync(`cmd /c ${copyCmd}`, { timeout: 15000 });
    console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${printerName}" (copy:${portName})`);
    try { fs.unlinkSync(tmpFile); } catch {}
    return { ok: true, jobId };
  } catch (err: any) {
    console.warn(`[Printer] Strategy 2 failed: ${err.message}`);
  }

  // Strategy 3: Use Windows print spooler via net use + copy
  try {
    // Share the printer and send via UNC
    const uncPath = `\\\\localhost\\${printerName}`;
    const shareCmd = `copy /b "${tmpFile}" "${uncPath}"`;
    console.log(`[Printer] Strategy 3: ${shareCmd}`);
    execSync(`cmd /c ${shareCmd}`, { timeout: 15000 });
    console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${printerName}" (unc)`);
    try { fs.unlinkSync(tmpFile); } catch {}
    return { ok: true, jobId };
  } catch (err: any) {
    console.warn(`[Printer] Strategy 3 failed: ${err.message}`);
  }

  // Strategy 4: Use RawPrinterHelper via PowerShell .NET interop
  try {
    const psScript = `
$signature = @'
[DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
[DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool ClosePrinter(IntPtr hPrinter);
[DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
[DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool EndDocPrinter(IntPtr hPrinter);
[DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool StartPagePrinter(IntPtr hPrinter);
[DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool EndPagePrinter(IntPtr hPrinter);
[DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
'@;
$type = Add-Type -MemberDefinition $signature -Name 'RawPrinterHelper' -Namespace 'FoodHub' -UsingNamespace 'System.Runtime.InteropServices' -PassThru;
[System.Runtime.InteropServices.StructLayout([System.Runtime.InteropServices.LayoutKind]::Sequential)]
class DOCINFOA { [string]$pDocName; [string]$pOutputFile; [string]$pDatatype; };

$hPrinter = [IntPtr]::Zero;
$di = New-Object DOCINFOA;
$di.pDocName = 'FoodHub Receipt';
$di.pDatatype = 'RAW';
$bytes = [System.IO.File]::ReadAllBytes('${tmpFile.replace(/\\/g, '\\\\')}');
if ($type::OpenPrinter('${printerName.replace(/'/g, "''")}', [ref]$hPrinter, [IntPtr]::Zero)) {
  if ($type::StartDocPrinter($hPrinter, 1, $di)) {
    $type::StartPagePrinter($hPrinter);
    $ptr = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length);
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length);
    $written = 0;
    $type::WritePrinter($hPrinter, $ptr, $bytes.Length, [ref]$written);
    [System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr);
    $type::EndPagePrinter($hPrinter);
    $type::EndDocPrinter($hPrinter);
  }
  $type::ClosePrinter($hPrinter);
  Write-Output "OK:$($bytes.Length)";
} else {
  Write-Error "Failed to open printer";
}
`.trim();
    console.log(`[Printer] Strategy 4: PowerShell Win32 winspool.Drv RAW print...`);
    const result = execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 20000,
    }).trim();
    console.log(`[Printer] Strategy 4 result: ${result}`);
    if (result.startsWith('OK:')) {
      console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${printerName}" (winspool)`);
      try { fs.unlinkSync(tmpFile); } catch {}
      return { ok: true, jobId };
    }
  } catch (err: any) {
    console.warn(`[Printer] Strategy 4 failed: ${err.message}`);
  }

  try { fs.unlinkSync(tmpFile); } catch {}
  return {
    ok: false,
    jobId,
    error: {
      code: 'PRINT_FAILED',
      message: `Falha ao imprimir em "${printerName}" (porta: ${portName}). Todas as 4 estratégias falharam. Verifique se a impressora está ligada e conectada.`,
    },
  };
}

export async function printReceipt(
  lines: ReceiptLine[],
  options: PrintOptions = {}
): Promise<PrintResult> {
  const jobId = generateJobId();
  const { printerName, paperWidth = 80 } = options;

  console.log(`[PRINT_REQUEST] jobId=${jobId}, printerName="${printerName || '(default)'}", paperWidth=${paperWidth}, linesCount=${lines.length}, ts=${new Date().toISOString()}`);

  // Resolve printer name
  let resolvedName = printerName;
  if (!resolvedName) {
    resolvedName = getDefaultPrinterName();
    console.log(`[Printer] No explicit printer, OS default: "${resolvedName || 'none'}"`);
  }

  if (!resolvedName) {
    return {
      ok: false,
      jobId,
      error: { code: 'PRINTER_NOT_CONFIGURED', message: 'Nenhuma impressora configurada. Defina uma impressora padrão no Windows.' },
    };
  }

  // Get printer port
  const portName = getPrinterPort(resolvedName);
  if (!portName) {
    return {
      ok: false,
      jobId,
      error: { code: 'PRINTER_NOT_FOUND', message: `Porta da impressora "${resolvedName}" não encontrada. Verifique se está conectada.` },
    };
  }

  try {
    // Build ESC/POS buffer (no native module needed!)
    const buffer = buildEscPosBuffer(lines, paperWidth);
    console.log(`[Printer] ESC/POS buffer built: ${buffer.length} bytes for "${resolvedName}" (port: ${portName})`);

    if (buffer.length === 0) {
      return { ok: false, jobId, error: { code: 'PRINT_FAILED', message: 'Buffer de impressão vazio.' } };
    }

    // Send raw bytes to printer port
    return sendRawToPort(buffer, resolvedName, portName, jobId);
  } catch (err: any) {
    const msg = err.message || String(err);
    console.error(`[Printer] Error: ${msg}`);
    return { ok: false, jobId, error: { code: 'PRINT_FAILED', message: msg } };
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
