/**
 * FoodHub PDV Desktop — ESC/POS Printer Module v2
 *
 * ZERO external dependencies. Builds ESC/POS byte buffers manually
 * and sends raw bytes to the Windows printer via multiple fallback strategies.
 */

// ─── Types ─────────────────────────────────────────────────

export interface ReceiptLine {
  type: 'text' | 'bold' | 'separator' | 'cut' | 'feed' | 'pair';
  value?: string;
  align?: 'left' | 'center' | 'right';
  left?: string;
  right?: string;
  lines?: number;
}

export interface PrintOptions {
  printerName?: string;
  paperWidth?: number;
}

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

// ─── ESC/POS Constants ─────────────────────────────────────

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const CMD = {
  INIT: Buffer.from([ESC, 0x40]),                    // ESC @  — Initialize
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),        // ESC a 0
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),      // ESC a 1
  ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]),       // ESC a 2
  BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),           // ESC E 1
  BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),          // ESC E 0
  CUT: Buffer.from([GS, 0x56, 0x00]),               // GS V 0  — Full cut
  PARTIAL_CUT: Buffer.from([GS, 0x56, 0x01]),        // GS V 1  — Partial cut
  FEED: Buffer.from([LF]),                           // Line feed
};

// ─── Helpers ───────────────────────────────────────────────

function generateJobId(): string {
  return `pj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Encode a string to CP860 (Portuguese) compatible bytes using latin1 as best-effort */
function encodeText(text: string): Buffer {
  // Replace common Unicode chars that CP860 doesn't handle
  const cleaned = text
    .replace(/✓/g, 'V')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, '...')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/€/g, 'EUR');
  return Buffer.from(cleaned, 'latin1');
}

function buildSeparator(cols: number): Buffer {
  return Buffer.from('-'.repeat(cols) + '\n', 'latin1');
}

function buildPair(left: string, right: string, cols: number): Buffer {
  const spacing = cols - left.length - right.length;
  const line = spacing > 0
    ? left + ' '.repeat(spacing) + right
    : `${left} ${right}`;
  return Buffer.from(line + '\n', 'latin1');
}

// ─── ESC/POS Buffer Builder (no external deps!) ────────────

function buildEscPosBuffer(lines: ReceiptLine[], paperWidth: number): Buffer {
  const cols = paperWidth === 58 ? 32 : 48;
  const parts: Buffer[] = [];

  // Initialize printer
  parts.push(CMD.INIT);

  for (const line of lines) {
    switch (line.type) {
      case 'text': {
        const align = line.align === 'center' ? CMD.ALIGN_CENTER
          : line.align === 'right' ? CMD.ALIGN_RIGHT
          : CMD.ALIGN_LEFT;
        parts.push(align);
        parts.push(encodeText((line.value || '') + '\n'));
        break;
      }
      case 'bold': {
        const align = line.align === 'center' ? CMD.ALIGN_CENTER
          : line.align === 'right' ? CMD.ALIGN_RIGHT
          : CMD.ALIGN_LEFT;
        parts.push(align);
        parts.push(CMD.BOLD_ON);
        parts.push(encodeText((line.value || '') + '\n'));
        parts.push(CMD.BOLD_OFF);
        break;
      }
      case 'separator':
        parts.push(CMD.ALIGN_LEFT);
        parts.push(buildSeparator(cols));
        break;
      case 'pair':
        parts.push(CMD.ALIGN_LEFT);
        parts.push(buildPair(line.left || '', line.right || '', cols));
        break;
      case 'feed': {
        const count = line.lines || 1;
        for (let i = 0; i < count; i++) {
          parts.push(CMD.FEED);
        }
        break;
      }
      case 'cut':
        parts.push(CMD.PARTIAL_CUT);
        break;
    }
  }

  // Reset alignment
  parts.push(CMD.ALIGN_LEFT);

  return Buffer.concat(parts);
}

// ─── Windows Printer Utilities ─────────────────────────────

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

// ─── Raw Print Strategies ──────────────────────────────────

function sendRawToPort(buffer: Buffer, printerName: string, portName: string, jobId: string): PrintResult {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { execSync } = require('child_process');

  const tmpFile = path.join(os.tmpdir(), `foodhub_print_${jobId}.bin`);
  fs.writeFileSync(tmpFile, buffer);
  console.log(`[Printer] Buffer ${buffer.length} bytes -> ${tmpFile}`);

  const cleanup = () => { try { fs.unlinkSync(tmpFile); } catch {} };
  const ok = (strategy: string): PrintResult => {
    console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${printerName}" (${strategy})`);
    cleanup();
    return { ok: true, jobId };
  };

  // Strategy 1: Direct port write
  try {
    const portPath = portName.startsWith('\\\\') ? portName : `\\\\.\\${portName}`;
    console.log(`[Printer] S1: Direct write to ${portPath}`);
    fs.writeFileSync(portPath, buffer);
    return ok(`direct:${portName}`);
  } catch (err: any) {
    console.warn(`[Printer] S1 failed: ${err.message}`);
  }

  // Strategy 2: copy /b via cmd
  try {
    const copyCmd = `copy /b "${tmpFile}" "\\\\.\\${portName}"`;
    console.log(`[Printer] S2: ${copyCmd}`);
    execSync(`cmd /c ${copyCmd}`, { timeout: 15000 });
    return ok(`copy:${portName}`);
  } catch (err: any) {
    console.warn(`[Printer] S2 failed: ${err.message}`);
  }

  // Strategy 3: UNC share
  try {
    const uncPath = `\\\\localhost\\${printerName}`;
    const shareCmd = `copy /b "${tmpFile}" "${uncPath}"`;
    console.log(`[Printer] S3: ${shareCmd}`);
    execSync(`cmd /c ${shareCmd}`, { timeout: 15000 });
    return ok('unc');
  } catch (err: any) {
    console.warn(`[Printer] S3 failed: ${err.message}`);
  }

  // Strategy 4: Win32 winspool.Drv via PowerShell
  try {
    const escapedTmpFile = tmpFile.replace(/\\/g, '\\\\');
    const escapedPrinter = printerName.replace(/'/g, "''");
    const psScript = `
$signature = @'
[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDatatype;
}
[DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
[DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true)]
public static extern bool ClosePrinter(IntPtr hPrinter);
[DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);
[DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true)]
public static extern bool EndDocPrinter(IntPtr hPrinter);
[DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true)]
public static extern bool StartPagePrinter(IntPtr hPrinter);
[DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true)]
public static extern bool EndPagePrinter(IntPtr hPrinter);
[DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true)]
public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
'@
$t = Add-Type -MemberDefinition $signature -Name 'RawPrint' -Namespace 'FH' -UsingNamespace 'System.Runtime.InteropServices' -PassThru
$hp = [IntPtr]::Zero
$di = New-Object FH.DOCINFOA
$di.pDocName = 'FoodHub Receipt'
$di.pDatatype = 'RAW'
$b = [System.IO.File]::ReadAllBytes('${escapedTmpFile}')
if ($t::OpenPrinter('${escapedPrinter}', [ref]$hp, [IntPtr]::Zero)) {
  if ($t::StartDocPrinter($hp, 1, $di)) {
    $t::StartPagePrinter($hp) | Out-Null
    $p = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($b.Length)
    [System.Runtime.InteropServices.Marshal]::Copy($b, 0, $p, $b.Length)
    $w = 0
    $t::WritePrinter($hp, $p, $b.Length, [ref]$w) | Out-Null
    [System.Runtime.InteropServices.Marshal]::FreeHGlobal($p)
    $t::EndPagePrinter($hp) | Out-Null
    $t::EndDocPrinter($hp) | Out-Null
  }
  $t::ClosePrinter($hp) | Out-Null
  Write-Output "OK:$($b.Length)"
} else {
  Write-Error "OpenPrinter failed"
}
`;
    console.log(`[Printer] S4: PowerShell winspool.Drv RAW print...`);
    const result = execSync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8', timeout: 20000 }
    ).trim();
    console.log(`[Printer] S4 result: ${result}`);
    if (result.includes('OK:')) {
      return ok('winspool');
    }
  } catch (err: any) {
    console.warn(`[Printer] S4 failed: ${err.message}`);
  }

  cleanup();
  return {
    ok: false,
    jobId,
    error: {
      code: 'PRINT_FAILED',
      message: `Falha ao imprimir em "${printerName}" (porta: ${portName}). Todas as 4 estrategias falharam. Verifique se a impressora esta ligada e conectada.`,
    },
  };
}

// ─── Public API ────────────────────────────────────────────

export async function printReceipt(
  lines: ReceiptLine[],
  options: PrintOptions = {}
): Promise<PrintResult> {
  const jobId = generateJobId();
  const { printerName, paperWidth = 80 } = options;

  console.log(`[PRINT_REQUEST] jobId=${jobId}, printer="${printerName || '(default)'}", paperWidth=${paperWidth}, lines=${lines.length}`);

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
      error: { code: 'PRINTER_NOT_CONFIGURED', message: 'Nenhuma impressora configurada. Defina uma impressora padrao no Windows.' },
    };
  }

  // Get printer port
  const portName = getPrinterPort(resolvedName);
  if (!portName) {
    return {
      ok: false,
      jobId,
      error: { code: 'PRINTER_NOT_FOUND', message: `Porta da impressora "${resolvedName}" nao encontrada. Verifique se esta conectada.` },
    };
  }

  try {
    const buffer = buildEscPosBuffer(lines, paperWidth);
    console.log(`[Printer] ESC/POS buffer: ${buffer.length} bytes for "${resolvedName}" (port: ${portName})`);

    if (buffer.length === 0) {
      return { ok: false, jobId, error: { code: 'PRINT_FAILED', message: 'Buffer de impressao vazio.' } };
    }

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
    { type: 'text', value: 'Teste de impressao ESC/POS v2', align: 'center' },
    { type: 'pair', left: 'Data:', right: new Date().toLocaleString('pt-BR') },
    { type: 'pair', left: 'Impressora:', right: printerName || 'Padrao do sistema' },
    { type: 'separator' },
    { type: 'text', value: 'Impressora funcionando!', align: 'center' },
    { type: 'feed', lines: 3 },
    { type: 'cut' },
  ];

  return printReceipt(testLines, { printerName });
}
