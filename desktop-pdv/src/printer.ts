/**
 * FoodHub PDV Desktop — ESC/POS Printer Module v4
 *
 * Correções aplicadas:
 * - Corrigida assinatura de StartDocPrinterA (retorna Int32, não bool)
 * - Não aborta mais se PortName não for encontrado
 * - Tenta winspool.Drv primeiro mesmo sem portName
 * - Fallback de porta só roda se houver portName
 * - listPrinters() menos rígido, listando impressoras reais do Windows
 */

export interface ReceiptLine {
  type: "text" | "bold" | "separator" | "cut" | "feed" | "pair";
  value?: string;
  align?: "left" | "center" | "right";
  left?: string;
  right?: string;
  lines?: number;
}

export interface PrintOptions {
  printerName?: string | null;
  paperWidth?: number;
  silent?: boolean;
  useDefaultPrinter?: boolean;
}

export type PrintErrorCode =
  | "NO_DEFAULT_PRINTER"
  | "PRINTER_NOT_FOUND"
  | "NO_DRIVER_SET"
  | "PRINT_FAILED"
  | "INTERNAL_ERROR";

export interface PrintResult {
  ok: boolean;
  jobId: string;
  error?: { code: PrintErrorCode; message: string };
}

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  INIT: Buffer.from([ESC, 0x40]),
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]),
  BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
  CUT: Buffer.from([GS, 0x56, 0x00]),
  PARTIAL_CUT: Buffer.from([GS, 0x56, 0x01]),
  FEED: Buffer.from([LF]),
};

function generateJobId(): string {
  return `pj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function encodeText(text: string): Buffer {
  const cleaned = text
    .replace(/✓/g, "V")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, "...")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/€/g, "EUR");
  return Buffer.from(cleaned, "latin1");
}

function buildSeparator(cols: number): Buffer {
  return Buffer.from("-".repeat(cols) + "\n", "latin1");
}

function buildPair(left: string, right: string, cols: number): Buffer {
  const leftSafe = left || "";
  const rightSafe = right || "";
  const spacing = cols - leftSafe.length - rightSafe.length;
  const line = spacing > 0 ? leftSafe + " ".repeat(spacing) + rightSafe : `${leftSafe} ${rightSafe}`;
  return Buffer.from(line + "\n", "latin1");
}

function buildEscPosBuffer(lines: ReceiptLine[], paperWidth: number): Buffer {
  const cols = paperWidth === 58 ? 32 : 48;
  const parts: Buffer[] = [];

  parts.push(CMD.INIT);

  for (const line of lines) {
    switch (line.type) {
      case "text": {
        const align =
          line.align === "center" ? CMD.ALIGN_CENTER : line.align === "right" ? CMD.ALIGN_RIGHT : CMD.ALIGN_LEFT;
        parts.push(align);
        parts.push(encodeText((line.value || "") + "\n"));
        break;
      }

      case "bold": {
        const align =
          line.align === "center" ? CMD.ALIGN_CENTER : line.align === "right" ? CMD.ALIGN_RIGHT : CMD.ALIGN_LEFT;
        parts.push(align);
        parts.push(CMD.BOLD_ON);
        parts.push(encodeText((line.value || "") + "\n"));
        parts.push(CMD.BOLD_OFF);
        break;
      }

      case "separator":
        parts.push(CMD.ALIGN_LEFT);
        parts.push(buildSeparator(cols));
        break;

      case "pair":
        parts.push(CMD.ALIGN_LEFT);
        parts.push(buildPair(line.left || "", line.right || "", cols));
        break;

      case "feed": {
        const count = line.lines || 1;
        for (let i = 0; i < count; i++) {
          parts.push(CMD.FEED);
        }
        break;
      }

      case "cut":
        parts.push(CMD.PARTIAL_CUT);
        break;
    }
  }

  parts.push(CMD.ALIGN_LEFT);
  return Buffer.concat(parts);
}

export function getWindowsDefaultPrinter(): string | undefined {
  try {
    const { execSync } = require("child_process");
    const output = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object -ExpandProperty Name"',
      { encoding: "utf-8", timeout: 5000 },
    ).trim();

    if (output) return output;
  } catch (err) {
    console.warn("[Printer] Failed to get default printer:", err);
  }

  return undefined;
}

function getPrinterPort(printerName: string): string | undefined {
  try {
    const { execSync } = require("child_process");
    const escaped = printerName.replace(/'/g, "''");
    const output = execSync(
      `powershell -NoProfile -Command "Get-Printer -Name '${escaped}' | Select-Object -ExpandProperty PortName"`,
      { encoding: "utf-8", timeout: 5000 },
    ).trim();

    if (output) {
      console.log(`[Printer] Port for "${printerName}": ${output}`);
      return output;
    }
  } catch (err) {
    console.warn(`[Printer] Failed to get port for "${printerName}":`, err);
  }

  return undefined;
}

function sendViaWinspool(bufferFile: string, printerName: string, jobId: string): boolean {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const { execSync } = require("child_process");

  const psFile = path.join(os.tmpdir(), `fh_print_${jobId}.ps1`);

  const psContent = `
$ErrorActionPreference = 'Stop'

$signature = @'
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDatatype;
}

public class RawPrinterHelper {
    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern Int32 StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
}
'@

Add-Type -TypeDefinition $signature -Language CSharp

$printerName = '${printerName.replace(/'/g, "''")}'
$dataFilePath = '${bufferFile.replace(/\\/g, "\\\\").replace(/'/g, "''")}'

$hPrinter = [System.IntPtr]::Zero
$di = New-Object DOCINFOA
$di.pDocName = 'FoodHub Receipt'
$di.pDatatype = 'RAW'

$bytes = [System.IO.File]::ReadAllBytes($dataFilePath)
Write-Host "FHLOG: Read $($bytes.Length) bytes from data file"

$openResult = [RawPrinterHelper]::OpenPrinter($printerName, [ref]$hPrinter, [System.IntPtr]::Zero)
if (-not $openResult) {
    $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Error "FHERR: OpenPrinter failed for '$printerName' (Win32 error $err)"
    exit 1
}
Write-Host "FHLOG: OpenPrinter OK, handle=$hPrinter"

try {
    $jobHandle = [RawPrinterHelper]::StartDocPrinter($hPrinter, 1, $di)
    if ($jobHandle -le 0) {
        $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
        Write-Error "FHERR: StartDocPrinter failed (Win32 error $err)"
        exit 1
    }
    Write-Host "FHLOG: StartDocPrinter OK, jobHandle=$jobHandle"

    $startPage = [RawPrinterHelper]::StartPagePrinter($hPrinter)
    if (-not $startPage) {
        $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
        Write-Error "FHERR: StartPagePrinter failed (Win32 error $err)"
        exit 1
    }
    Write-Host "FHLOG: StartPagePrinter OK"

    $unmanagedPtr = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $unmanagedPtr, $bytes.Length)

    try {
        $bytesWritten = 0
        $writeResult = [RawPrinterHelper]::WritePrinter($hPrinter, $unmanagedPtr, $bytes.Length, [ref]$bytesWritten)

        if (-not $writeResult) {
            $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
            Write-Error "FHERR: WritePrinter failed (Win32 error $err)"
            exit 1
        }

        Write-Host "FHLOG: WritePrinter OK, bytesWritten=$bytesWritten"
    }
    finally {
        [System.Runtime.InteropServices.Marshal]::FreeHGlobal($unmanagedPtr)
    }

    [RawPrinterHelper]::EndPagePrinter($hPrinter) | Out-Null
    [RawPrinterHelper]::EndDocPrinter($hPrinter) | Out-Null
    Write-Host "FHLOG: EndDoc/EndPage OK"
}
finally {
    [RawPrinterHelper]::ClosePrinter($hPrinter) | Out-Null
}

Write-Output "FHOK"
`;

  try {
    fs.writeFileSync(psFile, psContent, { encoding: "utf-8" });
    console.log(`[Printer] PS1 script written to ${psFile}`);

    const result = execSync(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${psFile}"`, {
      encoding: "utf-8",
      timeout: 25000,
    }).trim();

    console.log(`[Printer] Winspool result: ${result}`);

    try {
      fs.unlinkSync(psFile);
    } catch {}

    return result.includes("FHOK");
  } catch (err: any) {
    console.error("[Printer] Winspool failed:", err?.message || err);

    if (err?.stderr) {
      console.error("[Printer] PS stderr:", err.stderr.toString());
    }

    if (err?.stdout) {
      console.log("[Printer] PS stdout:", err.stdout.toString());
    }

    try {
      fs.unlinkSync(psFile);
    } catch {}

    return false;
  }
}

function sendDirectToPort(bufferFile: string, portName: string): boolean {
  const fs = require("fs");
  const { execSync } = require("child_process");

  try {
    const copyCmd = `copy /b "${bufferFile}" "\\\\.\\${portName}"`;
    console.log(`[Printer] Fallback copy/b: ${copyCmd}`);
    execSync(`cmd /c ${copyCmd}`, { timeout: 15000 });
    return true;
  } catch (err: any) {
    console.warn(`[Printer] copy/b failed: ${err.message}`);
  }

  try {
    const portPath = portName.startsWith("\\\\") ? portName : `\\\\.\\${portName}`;
    console.log(`[Printer] Fallback direct write: ${portPath}`);
    const data = fs.readFileSync(bufferFile);
    fs.writeFileSync(portPath, data);
    return true;
  } catch (err: any) {
    console.warn(`[Printer] Direct write failed: ${err.message}`);
  }

  return false;
}

function sendRawToPort(buffer: Buffer, printerName: string, portName: string | undefined, jobId: string): PrintResult {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");

  const tmpFile = path.join(os.tmpdir(), `foodhub_escpos_${jobId}.bin`);
  fs.writeFileSync(tmpFile, buffer);
  console.log(`[Printer] Buffer ${buffer.length} bytes -> ${tmpFile}`);

  const cleanup = () => {
    try {
      fs.unlinkSync(tmpFile);
    } catch {}
  };

  try {
    console.log("[Printer] === Strategy 1 (PRIMARY): winspool.Drv via .ps1 file ===");
    if (sendViaWinspool(tmpFile, printerName, jobId)) {
      console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${printerName}" (winspool)`);
      return { ok: true, jobId };
    }

    if (portName) {
      console.log(`[Printer] === Strategy 2 (FALLBACK): Direct port ${portName} ===`);
      if (sendDirectToPort(tmpFile, portName)) {
        console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${printerName}" (direct:${portName})`);
        return { ok: true, jobId };
      }
    } else {
      console.warn(`[Printer] Strategy 2 skipped: no portName for "${printerName}"`);
    }

    try {
      const { execSync } = require("child_process");
      const uncPath = `\\\\localhost\\${printerName}`;
      const shareCmd = `copy /b "${tmpFile}" "${uncPath}"`;
      console.log(`[Printer] === Strategy 3 (FALLBACK): UNC ${uncPath} ===`);
      execSync(`cmd /c ${shareCmd}`, { timeout: 15000 });
      console.log(`[PRINT_RESULT] jobId=${jobId}, ok=true, printer="${printerName}" (unc)`);
      return { ok: true, jobId };
    } catch (err: any) {
      console.warn(`[Printer] UNC failed: ${err.message}`);
    }

    return {
      ok: false,
      jobId,
      error: {
        code: "PRINT_FAILED",
        message: `Falha ao imprimir em "${printerName}". Verifique se a impressora está ligada, instalada corretamente no Windows e se o spooler está funcionando.`,
      },
    };
  } finally {
    cleanup();
  }
}

export async function printReceipt(lines: ReceiptLine[], options: PrintOptions = {}): Promise<PrintResult> {
  const jobId = generateJobId();
  const { printerName, paperWidth = 80, silent = true, useDefaultPrinter = false } = options;

  const normalizedPrinterName = typeof printerName === "string" ? printerName.trim() : printerName;

  const shouldUseDefaultPrinter = useDefaultPrinter || !normalizedPrinterName;

  console.log(
    `[PRINT_REQUEST] jobId=${jobId}, printer=${JSON.stringify(
      normalizedPrinterName,
    )}, useDefaultPrinter=${shouldUseDefaultPrinter}, silent=${silent}, paperWidth=${paperWidth}, lines=${lines.length}`,
  );

  const resolvedName = shouldUseDefaultPrinter ? getWindowsDefaultPrinter() : normalizedPrinterName || undefined;

  if (!resolvedName) {
    return {
      ok: false,
      jobId,
      error: {
        code: "NO_DEFAULT_PRINTER",
        message: "Nenhuma impressora padrão do Windows foi encontrada.",
      },
    };
  }

  try {
    const buffer = buildEscPosBuffer(lines, paperWidth);

    if (buffer.length === 0) {
      return {
        ok: false,
        jobId,
        error: {
          code: "PRINT_FAILED",
          message: "Buffer de impressão vazio.",
        },
      };
    }

    const portName = getPrinterPort(resolvedName);
    console.log(`[Printer] ESC/POS buffer: ${buffer.length} bytes for "${resolvedName}" (port: ${portName || "N/A"})`);

    return sendRawToPort(buffer, resolvedName, portName, jobId);
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(`[Printer] Error: ${msg}`);
    return {
      ok: false,
      jobId,
      error: {
        code: "PRINT_FAILED",
        message: msg,
      },
    };
  }
}

export async function listPrinters(): Promise<string[]> {
  try {
    const { execSync } = require("child_process");

    const output = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name"',
      { encoding: "utf-8", timeout: 8000 },
    ).trim();

    if (!output) return [];

    const blacklist = ["Microsoft Print to PDF", "Microsoft XPS Document Writer", "OneNote", "Fax"];

    const printers = output
      .split("\n")
      .map((n: string) => n.trim())
      .filter((n: string) => n.length > 0)
      .filter((n: string) => !blacklist.some((b) => n.toLowerCase().includes(b.toLowerCase())));

    return Array.from(new Set(printers));
  } catch (err) {
    console.error("[listPrinters] failed:", err);
    return [];
  }
}

export async function testPrint(printerName?: string): Promise<PrintResult> {
  const testLines: ReceiptLine[] = [
    { type: "bold", value: "FoodHub PDV Desktop v4", align: "center" },
    { type: "separator" },
    { type: "text", value: "Teste de impressao ESC/POS", align: "center" },
    { type: "text", value: "winspool.Drv via .ps1 file", align: "center" },
    { type: "pair", left: "Data:", right: new Date().toLocaleString("pt-BR") },
    { type: "pair", left: "Impressora:", right: printerName || "Padrao do sistema" },
    { type: "separator" },
    { type: "text", value: "Impressora funcionando!", align: "center" },
    { type: "feed", lines: 3 },
    { type: "cut" },
  ];

  return printReceipt(testLines, {
    printerName,
    useDefaultPrinter: !printerName,
    silent: true,
  });
}
