/**
 * FoodHub PDV Desktop — ESC/POS Printer Module v3
 *
 * ZERO external dependencies. Builds ESC/POS byte buffers manually
 * and sends raw bytes via Windows Print Spooler (winspool.Drv).
 *
 * KEY FIX (v3): The PowerShell winspool script is written to a .ps1
 * temp file instead of being passed inline, eliminating all escaping
 * issues that caused "Todas as 4 estratégias falharam".
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

// ─── ESC/POS Buffer Builder ────────────────────────────────

function buildEscPosBuffer(lines: ReceiptLine[], paperWidth: number): Buffer {
  const cols = paperWidth === 58 ? 32 : 48;
  const parts: Buffer[] = [];

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

  parts.push(CMD.ALIGN_LEFT);
  return Buffer.concat(parts);
}

// ─── Windows Printer Utilities ─────────────────────────────

function getDefaultPrinterName(): string | undefined {
  try {
    const { execSync } = require('child_process');
    const output = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object -ExpandProperty Name"',
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    if (output) return output;
  } catch {}
  return undefined;
}

function getPrinterPort(printerName: string): string | undefined {
  try {
    const { execSync } = require('child_process');
    const escaped = printerName.replace(/'/g, "''");
    const output = execSync(
      `powershell -NoProfile -Command "Get-Printer -Name '${escaped}' | Select-Object -ExpandProperty PortName"`,
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

// ─── RAW Print via winspool.Drv (PRIMARY STRATEGY) ─────────
// Writes the PowerShell script to a .ps1 temp file to avoid
// ALL escaping issues that plagued the inline approach.

function sendViaWinspool(bufferFile: string, printerName: string, jobId: string): boolean {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { execSync } = require('child_process');

  const psFile = path.join(os.tmpdir(), `fh_print_${jobId}.ps1`);

  // Build PS1 script content — no escaping needed since it's written to a file
  const psContent = `
$ErrorActionPreference = 'Stop'

$signature = @'
[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDatatype;
}

[DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out System.IntPtr hPrinter, System.IntPtr pd);

[DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool ClosePrinter(System.IntPtr hPrinter);

[DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool StartDocPrinter(System.IntPtr hPrinter, System.Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

[DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool EndDocPrinter(System.IntPtr hPrinter);

[DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool StartPagePrinter(System.IntPtr hPrinter);

[DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool EndPagePrinter(System.IntPtr hPrinter);

[DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
public static extern bool WritePrinter(System.IntPtr hPrinter, System.IntPtr pBytes, System.Int32 dwCount, out System.Int32 dwWritten);
'@

$rawPrinterType = Add-Type -MemberDefinition $signature -Name 'RawPrinterHelper' -Namespace 'FoodHub' -UsingNamespace 'System.Runtime.InteropServices' -PassThru

$printerName = '${printerName.replace(/'/g, "''")}'
$dataFilePath = '${bufferFile.replace(/\\/g, '\\\\').replace(/'/g, "''")}'

$hPrinter = [System.IntPtr]::Zero
$di = New-Object FoodHub.DOCINFOA
$di.pDocName = 'FoodHub Receipt'
$di.pDatatype = 'RAW'

$bytes = [System.IO.File]::ReadAllBytes($dataFilePath)
Write-Host "FHLOG: Read $($bytes.Length) bytes from data file"

$openResult = $rawPrinterType::OpenPrinter($printerName, [ref]$hPrinter, [System.IntPtr]::Zero)
if (-not $openResult) {
    $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Error "FHERR: OpenPrinter failed for '$printerName' (Win32 error $err)"
    exit 1
}
Write-Host "FHLOG: OpenPrinter OK, handle=$hPrinter"

try {
    $startDocResult = $rawPrinterType::StartDocPrinter($hPrinter, 1, $di)
    if (-not $startDocResult) {
        $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
        Write-Error "FHERR: StartDocPrinter failed (Win32 error $err)"
        exit 1
    }
    Write-Host "FHLOG: StartDocPrinter OK"

    $rawPrinterType::StartPagePrinter($hPrinter) | Out-Null
    Write-Host "FHLOG: StartPagePrinter OK"

    $unmanagedPtr = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $unmanagedPtr, $bytes.Length)
    
    $bytesWritten = 0
    $writeResult = $rawPrinterType::WritePrinter($hPrinter, $unmanagedPtr, $bytes.Length, [ref]$bytesWritten)
    [System.Runtime.InteropServices.Marshal]::FreeHGlobal($unmanagedPtr)

    if (-not $writeResult) {
        $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
        Write-Error "FHERR: WritePrinter failed (Win32 error $err)"
        exit 1
    }
    Write-Host "FHLOG: WritePrinter OK, bytesWritten=$bytesWritten"

    $rawPrinterType::EndPagePrinter($hPrinter) | Out-Null
    $rawPrinterType::EndDocPrinter($hPrinter) | Out-Null
    Write-Host "FHLOG: EndDoc/EndPage OK"
}
finally {
    $rawPrinterType::ClosePrinter($hPrinter) | Out-Null
}

Write-Output "FHOK:$($bytesWritten)"
`;

  try {
    // Write the PS1 script to a temp file (avoids ALL escaping issues)
    fs.writeFileSync(psFile, psContent, { encoding: 'utf-8' });
    console.log(`[Printer] PS1 script written to ${psFile}`);

    const result = execSync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${psFile}"`,
      { encoding: 'utf-8', timeout: 25000 }
    ).trim();

    console.log(`[Printer] Winspool result: ${result}`);

    // Cleanup PS1 file
    try { fs.unlinkSync(psFile); } catch {}

    return result.includes('FHOK:');
  } catch (err: any) {
    console.error(`[Printer] Winspool failed:`, err.message);
    // Log stderr if available
    if (err.stderr) {
      console.error(`[Printer] PS stderr:`, err.stderr.toString());
    }
    if (err.stdout) {
      console.log(`[Printer] PS stdout:`, err.stdout.toString());
    }
    // Cleanup
    try { fs.unlinkSync(psFile); } catch {}
    return false;
  }
}

// ─── Fallback: Direct port write ───────────────────────────

function sendDirectToPort(bufferFile: string, portName: string): boolean {
  const fs = require('fs');
  const { execSync } = require('child_process');

  // Strategy A: copy /b to port
  try {
    const copyCmd = `copy /b "${bufferFile}" "\\\\.\\${portName}"`;
    console.log(`[Printer] Fallback copy/b: ${copyCmd}`);
    execSync(`cmd /c ${copyCmd}`, { timeout: 15000 });
    return true;
  } catch (err: any) {
    console.warn(`[Printer] copy/b failed: ${err.message}`);
  }

  // Strategy B: direct fs write to port path
  try {
    const portPath = portName.startsWith('\\\\') ? portName : `\\\\.\\${portName}`;
    console.log(`[Printer] Fallback direct write: ${portPath}`);
    const data = fs.readFileSync(bufferFile);
    fs.writeFileSync(portPath, data);
    return true;
  } catch (err: any) {
    console.warn(`[Printer] Direct write failed: ${err.message}`);
  }

  return false;
}

// ─── Main Print Function ───────────────────────────────────

function sendRawToPort(buffer: Buffer, printerName: string, portName: string, jobId: string): PrintResult {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  // Write ESC/POS buffer to temp file
  const tmpFile = path.join(os.tmpdir(), `foodhub_escpos_${jobId}.bin`);
  fs.writeFileSync(tmpFile, buffer);
  console.log(`[Printer] Buffer ${buffer.length} bytes -> ${tmpFile}`);

  const cleanup = () => { try { fs.unlinkSync(tmpFile); } catch {} };

  // PRIMARY: Win32 winspool.Drv via PS1 file
  console.log(`[Printer] === Strategy 1 (PRIMARY): winspool.Drv via .ps1 file ===`);
  if (sendViaWinspool(tmpFile, printerName, jobId)) {
    console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${printerName}" (winspool)`);
    cleanup();
    return { ok: true, jobId };
  }

  // FALLBACK: Direct port access (for LPT/COM ports, rarely works for USB)
  console.log(`[Printer] === Strategy 2 (FALLBACK): Direct port ${portName} ===`);
  if (sendDirectToPort(tmpFile, portName)) {
    console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${printerName}" (direct:${portName})`);
    cleanup();
    return { ok: true, jobId };
  }

  // FALLBACK 2: UNC share
  try {
    const { execSync } = require('child_process');
    const uncPath = `\\\\localhost\\${printerName}`;
    const shareCmd = `copy /b "${tmpFile}" "${uncPath}"`;
    console.log(`[Printer] === Strategy 3 (FALLBACK): UNC ${uncPath} ===`);
    execSync(`cmd /c ${shareCmd}`, { timeout: 15000 });
    console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${printerName}" (unc)`);
    cleanup();
    return { ok: true, jobId };
  } catch (err: any) {
    console.warn(`[Printer] UNC failed: ${err.message}`);
  }

  cleanup();
  return {
    ok: false,
    jobId,
    error: {
      code: 'PRINT_FAILED',
      message: `Falha ao imprimir em "${printerName}" (porta: ${portName}). Verifique se a impressora esta ligada, conectada e com driver "Generic / Text Only".`,
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

    // Step 1: Verify physical USB print device presence via PnP
    let usbPresent = false;
    try {
      const count = execSync(
        'powershell -NoProfile -Command "(@(Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -match \'USBPRINT\' -and $_.Status -eq \'OK\' })).Count"',
        { encoding: 'utf-8', timeout: 8000 }
      ).trim();
      usbPresent = (parseInt(count, 10) || 0) > 0;
    } catch {}

    if (!usbPresent) {
      console.log('[listPrinters] No USB print device physically connected.');
      return [];
    }

    // Step 2: Get printer names on USB ports only
    const output = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Where-Object { $_.PortName -match \'^USB\' } | Select-Object -ExpandProperty Name"',
      { encoding: 'utf-8', timeout: 8000 }
    ).trim();

    if (!output) return [];

    const printers: string[] = output.split('\n').map((n: string) => n.trim()).filter((n: string) => n.length > 0);
    return Array.from(new Set(printers));
  } catch {
    return [];
  }
}

export async function testPrint(printerName?: string): Promise<PrintResult> {
  const testLines: ReceiptLine[] = [
    { type: 'bold', value: 'FoodHub PDV Desktop v3', align: 'center' },
    { type: 'separator' },
    { type: 'text', value: 'Teste de impressao ESC/POS', align: 'center' },
    { type: 'text', value: 'winspool.Drv via .ps1 file', align: 'center' },
    { type: 'pair', left: 'Data:', right: new Date().toLocaleString('pt-BR') },
    { type: 'pair', left: 'Impressora:', right: printerName || 'Padrao do sistema' },
    { type: 'separator' },
    { type: 'text', value: 'Impressora funcionando!', align: 'center' },
    { type: 'feed', lines: 3 },
    { type: 'cut' },
  ];

  return printReceipt(testLines, { printerName });
}
