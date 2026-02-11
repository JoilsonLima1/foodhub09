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

  // Apply paper width CSS variable from config
  useEffect(() => {
    if (open) {
      const config = getPrinterConfig();
      document.documentElement.style.setProperty('--receipt-width', config.paperWidth);
    }
  }, [open]);

  const getAgentEndpoint = () => settings?.agent_endpoint || 'http://127.0.0.1:8123';

  const buildHTML = () => {
    const config = getPrinterConfig();
    const paperWidth = config.paperWidth.replace('mm', '') as PaperWidthMM;
    const now = new Date();

    return {
      html: buildReceiptHTML({
        tenantName,
        tenantLogo,
        orderNumber,
        dateStr: now.toLocaleDateString('pt-BR'),
        timeStr: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
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
      }),
      paperWidth,
    };
  };

  /** Find the "caixa" route: prefer route_type 'recibo', fallback to label 'caixa' */
  const findCaixaRoute = () => {
    // First try route_type ilike 'recibo'
    const recibo = routes.find(r => r.route_type.toLowerCase() === 'recibo');
    if (recibo) return recibo;
    // Fallback: label ilike 'caixa' or route_type 'caixa'
    const caixa = routes.find(
      r => r.route_type.toLowerCase() === 'caixa' || r.label.toLowerCase() === 'caixa'
    );
    return caixa || null;
  };

  const handlePrint = async () => {
    console.log('[PRINT] click imprimir');
    setIsPrinting(true);

    try {
      const { html, paperWidth } = buildHTML();
      const endpoint = getAgentEndpoint();

      // 1. Find caixa route
      const caixaRoute = findCaixaRoute();
      console.log('[PRINT] rota caixa:', caixaRoute);
      console.log('[PRINT] settings.print_mode:', settings?.print_mode);
      console.log('[PRINT] agent_endpoint:', endpoint);

      // 2. Only attempt agent if mode is AGENT
      if (settings?.print_mode === 'AGENT') {
        const isInIframe = window.self !== window.top;
        const isHTTPS = window.location.protocol === 'https:';
        const endpointIsHTTP = endpoint.startsWith('http://');

        // Warn if Mixed Content will likely block
        if (isHTTPS && endpointIsHTTP) {
          console.warn('[PRINT] ⚠ HTTPS→HTTP: navegador pode bloquear. Publique o app e acesse pelo domínio publicado.');
        }

        if (!caixaRoute?.printer_name) {
          console.log('[PRINT] Rota Caixa sem printer_name, usando impressora padrão do Agent');
        }

        const pw = Number(caixaRoute?.paper_width || paperWidth) === 58 ? 58 : 80;
        const body: Record<string, unknown> = {
          html,
          larguraDoPapel: pw,
        };
        if (caixaRoute?.printer_name) {
          body.nomeDaImpressora = caixaRoute.printer_name;
        }

        console.log('[PRINT] POST /imprimir/recibo → printer:', body.nomeDaImpressora || '(padrão)', 'pw:', pw);
        toast({ title: '🖨️ Enviando para Agent...' });

        try {
          const postResp = await fetch(`${endpoint}/imprimir/recibo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
          });

          const postData = await postResp.json().catch(() => ({}));
          console.log('[PRINT] post status:', postResp.status, 'body:', postData);

          if (postResp.ok) {
            toast({
              title: '✓ Impresso via Agent',
              description: caixaRoute?.printer_name
                ? `Impressora: ${caixaRoute.printer_name}`
                : 'Impressora padrão do sistema',
            });
          } else {
            // POST failed but we TRIED the agent — do NOT open browser dialog
            const errMsg = (postData as any)?.message || (postData as any)?.error || `HTTP ${postResp.status}`;
            toast({
              title: 'Erro na impressão (Agent)',
              description: errMsg,
              variant: 'destructive',
            });
          }
          // Agent was reachable — return WITHOUT browser print
          return;
        } catch (fetchErr) {
          // Network error = agent truly unreachable
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
          // Fall through to browser print only when agent is unreachable
        }
      }

      // Fallback: browser print (only reached if agent unreachable or mode != AGENT)
      console.log('[PRINT] Usando impressão do navegador (fallback)');
      printReceiptHTML(html, paperWidth);
    } finally {
      setIsPrinting(false);
    }
  };

  /** Diagnostic: check agent health + printers */
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
        if (data.uptime != null) results.push(`Uptime: ${data.uptime}s`);
      } catch {
        results.push('Health: ❌ Não conseguiu conectar');
      }

      // Printers
      try {
        const resp = await fetch(`${endpoint}/impressoras`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        const data = await resp.json().catch(() => ({}));
        const printers = (data as any)?.impressoras || (data as any)?.printers || [];
        const defaultP = (data as any)?.impressoraPadrao || (data as any)?.defaultPrinter || 'N/A';
        results.push(`Impressoras: ${printers.length} encontrada(s)`);
        results.push(`Padrão: ${defaultP}`);
        if (printers.length > 0) {
          const names = printers.map((p: any) => typeof p === 'string' ? p : p.nome || p.name).join(', ');
          results.push(`Lista: ${names}`);
        }
      } catch {
        results.push('Impressoras: ❌ Não conseguiu consultar');
      }

      // Route info
      const caixaRoute = findCaixaRoute();
      results.push(`Rota Caixa: ${caixaRoute ? `"${caixaRoute.label}" → ${caixaRoute.printer_name || '(sem impressora)'}` : '❌ Não encontrada'}`);
      results.push(`Modo: ${settings?.print_mode || 'N/A'}`);
      results.push(`Endpoint: ${endpoint}`);

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

        {/* Diagnostic button — only show when AGENT mode */}
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
