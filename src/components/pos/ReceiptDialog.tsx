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
        // Health check
        let agentOnline = false;
        try {
          toast({ title: 'Agent check...' });
          const healthResp = await fetch(`${endpoint}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(1500),
          });
          agentOnline = healthResp.ok;
          const healthData = await healthResp.json().catch(() => ({}));
          console.log('[PRINT] health ok?', agentOnline, 'status', healthResp.status, 'data', healthData);
        } catch (err) {
          console.log('[PRINT] health FAIL:', err);
          agentOnline = false;
        }

        if (agentOnline) {
          // Agent is online — NEVER call window.print from here
          toast({ title: 'Agent online ✅ enviando impressão...' });

          if (!caixaRoute?.printer_name) {
            console.log('[PRINT] Rota Caixa sem printer_name, tentando impressora padrão');
          }

          const pw = Number(caixaRoute?.paper_width || paperWidth) === 58 ? 58 : 80;
          const body: Record<string, unknown> = {
            html,
            larguraDoPapel: pw,
          };
          if (caixaRoute?.printer_name) {
            body.nomeDaImpressora = caixaRoute.printer_name;
          }

          console.log('[PRINT] POST /imprimir/recibo body keys:', Object.keys(body), 'printer:', body.nomeDaImpressora, 'pw:', pw);

          try {
            const postResp = await fetch(`${endpoint}/imprimir/recibo`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
              signal: AbortSignal.timeout(15000),
            });

            const postData = await postResp.json().catch(() => ({}));
            console.log('[PRINT] post status:', postResp.status);
            console.log('[PRINT] post body:', postData);

            if (postResp.ok) {
              toast({
                title: '✓ Enviado para impressão (Agent)',
                description: caixaRoute?.printer_name
                  ? `Impressora: ${caixaRoute.printer_name}`
                  : 'Impressora padrão do sistema',
              });
            } else {
              // POST failed but agent IS online — do NOT fallback to browser
              const errMsg = (postData as any)?.message || (postData as any)?.error || `HTTP ${postResp.status}`;
              toast({
                title: 'Falhou em: POST /imprimir/recibo',
                description: errMsg,
                variant: 'destructive',
              });
            }
          } catch (postErr) {
            console.error('[PRINT] POST /imprimir/recibo exception:', postErr);
            toast({
              title: 'Falhou em: POST /imprimir/recibo',
              description: 'Timeout ou erro de rede ao enviar para o Agent.',
              variant: 'destructive',
            });
          }

          // Agent was online — return WITHOUT calling browser print
          return;
        }

        // Agent offline — fallback to browser
        console.log('[PRINT] Agent offline, fallback para navegador');
        toast({
          title: 'Falhou em: HEALTH',
          description: 'Agent offline. Usando impressão pelo navegador.',
          variant: 'destructive',
        });
      }

      // Fallback: browser print (only reached if agent offline or mode != AGENT)
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
