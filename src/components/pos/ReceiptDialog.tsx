import { useRef, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, CheckCircle, Loader2, Stethoscope } from 'lucide-react';
import { ReceiptPrint } from './ReceiptPrint';
import type { CartItem } from '@/types/database';
import { getPrinterConfig } from '@/components/settings/PrinterSettings';
import { printReceiptHTML, buildReceiptHTML, type PaperWidthMM } from '@/lib/thermalPrint';
import { useTenantPrintSettings } from '@/hooks/useTenantPrintSettings';
import { usePrinterRoutes } from '@/hooks/usePrinterRoutes';
import { useToast } from '@/hooks/use-toast';

const paymentMethodLabels: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  voucher: 'Voucher',
  mixed: 'Misto',
};

interface ReceiptLine {
  type: 'text' | 'bold' | 'separator' | 'cut' | 'feed' | 'pair';
  value?: string;
  align?: 'left' | 'center' | 'right';
  left?: string;
  right?: string;
  lines?: number;
}

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: number;
  items: CartItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  cashierName: string;
  tenantName?: string;
  tenantLogo?: string | null;
}

export function ReceiptDialog({
  open,
  onOpenChange,
  orderNumber,
  items,
  subtotal,
  total,
  paymentMethod,
  cashierName,
  tenantName = 'FoodHub09',
  tenantLogo,
}: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings } = useTenantPrintSettings();
  const { routes } = usePrinterRoutes();
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  useEffect(() => {
    if (open) {
      const config = getPrinterConfig();
      document.documentElement.style.setProperty('--receipt-width', config.paperWidth);
    }
  }, [open]);

  const getAgentEndpoint = () => settings?.agent_endpoint || 'http://127.0.0.1:8123';

  const findCaixaRoute = () => {
    const recibo = routes.find(r => r.route_type.toLowerCase() === 'recibo');
    if (recibo) return recibo;
    const caixa = routes.find(
      r => r.route_type.toLowerCase() === 'caixa' || r.label.toLowerCase() === 'caixa'
    );
    return caixa || null;
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  /** Build structured ESC/POS lines for the agent */
  const buildReceiptLines = (): ReceiptLine[] => {
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR');
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const lines: ReceiptLine[] = [
      { type: 'bold', value: tenantName, align: 'center' },
      { type: 'separator' },
      { type: 'bold', value: `PEDIDO #${orderNumber}`, align: 'center' },
      { type: 'pair', left: 'Data:', right: `${date} ${time}` },
      { type: 'pair', left: 'Caixa:', right: cashierName },
      { type: 'separator' },
    ];

    // Items
    items.forEach((item, i) => {
      const name = item.variationName
        ? `${item.productName} (${item.variationName})`
        : item.productName;
      lines.push({ type: 'text', value: `${i + 1}. ${name}` });
      lines.push({
        type: 'pair',
        left: `   ${item.quantity}x ${formatCurrency(item.unitPrice)}`,
        right: formatCurrency(item.totalPrice),
      });
      if (item.notes) {
        lines.push({ type: 'text', value: `   Obs: ${item.notes}` });
      }
    });

    lines.push({ type: 'separator' });
    lines.push({ type: 'pair', left: 'Subtotal:', right: formatCurrency(subtotal) });
    lines.push({ type: 'bold', value: `TOTAL: ${formatCurrency(total)}`, align: 'right' });
    lines.push({
      type: 'pair',
      left: 'Pagamento:',
      right: paymentMethodLabels[paymentMethod] || paymentMethod,
    });
    lines.push({ type: 'separator' });
    lines.push({ type: 'text', value: 'Obrigado pela preferência!', align: 'center' });
    lines.push({ type: 'feed', lines: 3 });
    lines.push({ type: 'cut' });

    return lines;
  };

  const handlePrint = async () => {
    console.log('[PRINT] click imprimir');
    setIsPrinting(true);

    try {
      const endpoint = getAgentEndpoint();
      const caixaRoute = findCaixaRoute();

      // Only attempt agent if mode is AGENT
      if (settings?.print_mode === 'AGENT') {
        const isHTTPS = window.location.protocol === 'https:';
        const endpointIsHTTP = endpoint.startsWith('http://');
        const isInIframe = window.self !== window.top;

        if (isHTTPS && endpointIsHTTP) {
          console.warn('[PRINT] ⚠ HTTPS→HTTP: navegador pode bloquear.');
        }

        const pw = Number(caixaRoute?.paper_width || settings.paper_width) === 58 ? 58 : 80;
        const receiptLines = buildReceiptLines();

        const body: Record<string, unknown> = {
          lines: receiptLines,
          larguraDoPapel: pw,
        };
        if (caixaRoute?.printer_name) {
          body.nomeDaImpressora = caixaRoute.printer_name;
        }

        console.log('[PRINT] POST /print → printer:', body.nomeDaImpressora || '(padrão)', 'pw:', pw);
        toast({ title: '🖨️ Enviando para Agent...' });

        try {
          const resp = await fetch(`${endpoint}/print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
          });

          const data = await resp.json().catch(() => ({}));
          console.log('[PRINT] response:', resp.status, data);

          if (resp.ok) {
            toast({
              title: '✓ Impresso via ESC/POS',
              description: caixaRoute?.printer_name
                ? `Impressora: ${caixaRoute.printer_name}`
                : 'Impressora padrão do sistema',
            });
          } else {
            const errMsg = (data as any)?.message || (data as any)?.error || `HTTP ${resp.status}`;
            const code = (data as any)?.code || '';

            if (code === 'PRINTER_NOT_FOUND') {
              toast({
                title: 'Impressora não encontrada',
                description: 'Abra o Diagnóstico do Agent e configure a impressora padrão.',
                variant: 'destructive',
                duration: 8000,
              });
            } else {
              toast({
                title: 'Erro na impressão (Agent)',
                description: errMsg,
                variant: 'destructive',
              });
            }
          }
          // Agent was reachable — do NOT fall through to browser print
          return;
        } catch (fetchErr) {
          console.error('[PRINT] Agent unreachable:', fetchErr);

          if (isInIframe || (isHTTPS && endpointIsHTTP)) {
            toast({
              title: 'Agent inacessível (preview bloqueado)',
              description: 'O preview HTTPS não consegue acessar o Agent HTTP local. Publique o app e acesse pelo domínio publicado no PC do Agent.',
              variant: 'destructive',
              duration: 10000,
            });
          } else {
            toast({
              title: 'Agent offline',
              description: 'Não foi possível conectar ao Agent. Usando impressão do navegador.',
              variant: 'destructive',
            });
          }
          // Fall through to browser print
        }
      }

      // Fallback: browser print
      console.log('[PRINT] Usando impressão do navegador (fallback)');
      const config = getPrinterConfig();
      const paperWidth = config.paperWidth.replace('mm', '') as PaperWidthMM;
      const html = buildReceiptHTML({
        tenantName,
        tenantLogo,
        orderNumber,
        dateStr: new Date().toLocaleDateString('pt-BR'),
        timeStr: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        cashierName,
        items: items.map((item, index) => ({
          index: index + 1,
          name: item.productName,
          variationName: item.variationName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
        })),
        subtotal,
        total,
        paymentMethodLabel: paymentMethodLabels[paymentMethod] || paymentMethod,
      });
      printReceiptHTML(html, paperWidth);
    } finally {
      setIsPrinting(false);
    }
  };

  /** Diagnostic: check agent health + printers + config */
  const handleDiagnostic = async () => {
    setIsDiagnosing(true);
    const endpoint = getAgentEndpoint();
    const results: string[] = [];

    try {
      // Health
      try {
        const resp = await fetch(`${endpoint}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        });
        const data = await resp.json().catch(() => ({}));
        results.push(`Health: ${resp.ok ? '✅ OK' : '❌ FAIL'} (${resp.status})`);
        if (data.version) results.push(`Versão: ${data.version}`);
        if (data.mode) results.push(`Modo: ${data.mode}`);
        if (data.uptime != null) results.push(`Uptime: ${data.uptime}s`);
      } catch {
        results.push('Health: ❌ Não conseguiu conectar');
      }

      // Diagnostic endpoint
      try {
        const resp = await fetch(`${endpoint}/diagnostic`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        const data = await resp.json().catch(() => ({}));
        results.push(`Impressoras: ${data.printers_detected_count || 0} encontrada(s)`);
        results.push(`Padrão (Agent): ${data.printer_default || 'N/A'}`);
        if (data.printers_detected?.length > 0) {
          results.push(`Lista: ${data.printers_detected.join(', ')}`);
        }
        if (data.last_error) {
          results.push(`Último erro: ${data.last_error}`);
        }
      } catch {
        results.push('Diagnóstico: ❌ Não conseguiu consultar');
      }

      // Route info
      const caixaRoute = findCaixaRoute();
      results.push(`Rota Caixa: ${caixaRoute ? `"${caixaRoute.label}" → ${caixaRoute.printer_name || '(sem impressora)'}` : '❌ Não encontrada'}`);
      results.push(`Endpoint: ${endpoint}`);

      if (!caixaRoute?.printer_name) {
        results.push('⚠ Configure uma impressora na Rota Caixa ou defina a padrão no Agent.');
      }

      toast({
        title: '🔍 Diagnóstico do Agent',
        description: results.join('\n'),
        duration: 15000,
      });

      console.log('[DIAG]', results);
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Pedido #{orderNumber} Concluído!
          </DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden bg-muted/50">
          <ReceiptPrint
            ref={receiptRef}
            orderNumber={orderNumber}
            items={items}
            subtotal={subtotal}
            total={total}
            paymentMethod={paymentMethod}
            cashierName={cashierName}
            tenantName={tenantName}
            tenantLogo={tenantLogo}
          />
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
          <Button className="flex-1" onClick={handlePrint} disabled={isPrinting}>
            {isPrinting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            {isPrinting ? 'Imprimindo...' : 'Imprimir'}
          </Button>
        </div>

        {settings?.print_mode === 'AGENT' && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={handleDiagnostic}
            disabled={isDiagnosing}
          >
            {isDiagnosing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Stethoscope className="h-3 w-3 mr-1" />
            )}
            Diagnóstico do Agent
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
