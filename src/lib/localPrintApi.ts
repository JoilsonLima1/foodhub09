/**
 * Local Print API client — comunicação com o agente Python em 127.0.0.1:8765
 */

const BASE_URL = 'http://127.0.0.1:8765';

export interface LocalPrintLine {
  type: 'text' | 'bold' | 'separator' | 'cut' | 'feed' | 'pair';
  value?: string;
  align?: 'left' | 'center' | 'right';
  left?: string;
  right?: string;
  lines?: number;
}

export interface LocalPrintResult {
  ok: boolean;
  jobId?: string;
  error?: { code: string; message: string };
}

export interface LocalPrinterInfo {
  name: string;
  is_default?: boolean;
}

export interface LocalPrintConfig {
  selected_printer?: string | null;
  paper_width?: number;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LocalPrintAPI ${res.status}: ${body}`);
  }
  return res.json();
}

/** Verifica se o agente local está rodando */
export async function checkHealth(): Promise<boolean> {
  try {
    await apiFetch('/health');
    return true;
  } catch {
    return false;
  }
}

/** Lista impressoras disponíveis no Windows */
export async function listPrinters(): Promise<LocalPrinterInfo[]> {
  return apiFetch<LocalPrinterInfo[]>('/printers');
}

/** Obtém configuração atual do agente (impressora selecionada, etc.) */
export async function getConfig(): Promise<LocalPrintConfig> {
  return apiFetch<LocalPrintConfig>('/config');
}

/** Seleciona a impressora no agente local */
export async function selectPrinter(printerName: string): Promise<void> {
  await apiFetch('/config/select-printer', {
    method: 'POST',
    body: JSON.stringify({ printer_name: printerName }),
  });
}

/** Imprime cupom silenciosamente via API local */
export async function printReceipt(
  lines: LocalPrintLine[],
  paperWidth: number = 80
): Promise<LocalPrintResult> {
  try {
    const result = await apiFetch<any>('/print/receipt', {
      method: 'POST',
      body: JSON.stringify({
        paper_width: paperWidth,
        use_saved_printer: true,
        use_windows_default_if_missing: true,
        lines,
      }),
    });

    return {
      ok: true,
      jobId: result.job_id || result.jobId || undefined,
    };
  } catch (err: any) {
    const msg = err.message || String(err);

    if (msg.includes('no default') || msg.includes('NO_DEFAULT')) {
      return { ok: false, error: { code: 'NO_DEFAULT_PRINTER', message: msg } };
    }
    if (msg.includes('not found') || msg.includes('NOT_FOUND')) {
      return { ok: false, error: { code: 'PRINTER_NOT_FOUND', message: msg } };
    }

    return { ok: false, error: { code: 'PRINT_FAILED', message: msg } };
  }
}

/** Imprime página de teste */
export async function printTest(): Promise<LocalPrintResult> {
  try {
    await apiFetch('/print/test', { method: 'POST' });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: { code: 'PRINT_FAILED', message: err.message } };
  }
}
