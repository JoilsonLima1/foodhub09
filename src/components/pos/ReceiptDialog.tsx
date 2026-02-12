import { useRef, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, CheckCircle, Loader2, Stethoscope, Download } from 'lucide-react';
import { ReceiptPrint } from './ReceiptPrint';
import type { CartItem } from '@/types/database';
import { getPrinterConfig } from '@/components/settings/PrinterSettings';
import { printReceiptHTML, buildReceiptHTML, type PaperWidthMM } from '@/lib/thermalPrint';
import { useTenantPrintSettings } from '@/hooks/useTenantPrintSettings';
import { useDesktopPdvSettings } from '@/hooks/useDesktopPdvSettings';
import { usePrinterRoutes } from '@/hooks/usePrinterRoutes';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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

/** Map error codes to user-friendly guidance */
function getErrorGuidance(code?: string): string {
  switch (code) {
    case 'PRINTER_NOT_CONFIGURED':
      return 'Adicione uma impressora ao setor Caixa nas configurações.';
    case 'PRINTER_NOT_FOUND':
      return 'Verifique se a impressora está ligada e conectada ao computador.';
    case 'NO_DRIVER_SET':
      return 'Instale o driver "Generic / Text Only" no Painel de Controle → Impressoras.';
    case 'PRINT_FAILED':
      return 'Tente reimprimir. Se persistir, verifique a conexão da impressora.';
    default:
      return 'Verifique a impressora e tente novamente.';
  }
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
  const { data: desktopUrls } = useDesktopPdvSettings();
  const { routes } = usePrinterRoutes();
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [showDesktopFallback, setShowDesktopFallback] = useState(false);

  useEffect(() => {
    if (open) {
      const config = getPrinterConfig();
      document.documentElement.style.setProperty('--receipt-width', config.paperWidth);
    }
  }, [open]);

  const findCaixaRoute = () => {
    // Use route_key for reliable matching — never depend on label text
    return routes.find(r => r.route_key === 'caixa') || null;
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  /** Build structured ESC/POS lines for the desktop bridge */
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
    console.log('[PRINT] click imprimir, mode:', settings?.print_mode, 'bridge:', !!window.foodhub);
    setIsPrinting(true);

    try {
      const caixaRoute = findCaixaRoute();
      console.log('[PRINT] caixaRoute:', caixaRoute ? { route_key: caixaRoute.route_key, printers: caixaRoute.printers } : 'NOT FOUND');

      // ─── Desktop mode: use Electron bridge (window.foodhub) ───
      if (settings?.print_mode === 'desktop') {
        if (window.foodhub?.printReceipt) {
          const pw = Number(caixaRoute?.paper_width || settings.paper_width) === 58 ? 58 : 80;
          const receiptLines = buildReceiptLines();
          // null = explicit "use OS default" (no config fallback in Electron)
          const printers: (string | null)[] = caixaRoute?.printers?.length
            ? caixaRoute.printers
            : [null];

          console.log('[PRINT] Desktop bridge → route_key=caixa, resolvedPrinters:', printers, 'pw:', pw);
          toast({ title: '🖨️ Enviando para FoodHub PDV Desktop...' });

          for (const printerName of printers) {
            const sendingPrinterName = printerName || null;
            console.log(`[PRINT] sendingPrinterName: ${JSON.stringify(sendingPrinterName)}`);
            const result = await window.foodhub.printReceipt({
              lines: receiptLines,
              printerName: sendingPrinterName as any,
              paperWidth: pw,
            });

            console.log('[PRINT] result:', { ok: result.ok, jobId: result.jobId, error: result.error });

            if (result.ok) {
              toast({
                title: '✅ Impresso com sucesso',
                description: printerName
                  ? `Impressora: ${printerName}`
                  : 'Impressora padrão do sistema',
              });
            } else {
              const errCode = result.error?.code || 'UNKNOWN';
              const errMsg = result.error?.message || 'Falha ao imprimir.';
              toast({
                title: `❌ Falha ao imprimir (${errCode})`,
                description: `${errMsg}\n${getErrorGuidance(errCode)}`,
                variant: 'destructive',
                duration: 10000,
              });
            }
          }
          return;
        }

        // Desktop mode selected but not running in Electron — show guided fallback
        setShowDesktopFallback(true);
        return;
      }

      // ─── SmartPOS mode: create print_job ───
      if (settings?.print_mode === 'smartpos') {
        if (!tenantId) return;
        const receiptLines = buildReceiptLines();
        const payload = {
          version: 1,
          title: tenantName,
          job_type: 'RECEIPT' as const,
          order_id: String(orderNumber),
          target: { sector: 'caixa' },
          lines: receiptLines.map(l => {
            if (l.type === 'separator') return { type: 'hr' };
            if (l.type === 'bold') return { type: 'text', value: l.value || '', align: l.align || 'left', bold: true };
            if (l.type === 'pair') return { type: 'pair', left: l.left || '', right: l.right || '', bold: false };
            if (l.type === 'cut') return { type: 'cut' };
            if (l.type === 'feed') return { type: 'text', value: '' };
            return { type: 'text', value: l.value || '', align: l.align || 'left', bold: false };
          }),
        };
        const { error: jobError } = await supabase.from('print_jobs').insert({
          tenant_id: tenantId,
          device_id: null,
          source: 'pdv',
          job_type: 'RECEIPT',
          payload,
          priority: 3,
          created_by_user_id: user?.id || null,
        });
        if (jobError) {
          console.error('Failed to create print job:', jobError);
          toast({
            title: 'Erro ao enfileirar impressão',
            description: 'Não foi possível enviar para a maquininha.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: '📱 Enviado para SmartPOS',
            description: 'O cupom será impresso pela maquininha em instantes.',
            duration: 4000,
          });
        }
        return;
      }

      // ─── Web mode (or fallback): browser window.print ───
      console.log('[PRINT] Usando impressão do navegador');
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

  /** Diagnostic: check desktop bridge status */
  const handleDiagnostic = async () => {
    setIsDiagnosing(true);
    const results: string[] = [];

    try {
      results.push(`Modo atual: ${settings?.print_mode || 'web'}`);

      if (window.foodhub) {
        results.push('Desktop PDV: ✅ Conectado');

        // Use getStatus if available
        if (window.foodhub.getStatus) {
          try {
            const status = await window.foodhub.getStatus();
            results.push(`Versão: ${status.appVersion}`);
            results.push(`Impressoras: ${status.printersCount} encontrada(s)`);
            results.push(`Padrão: ${status.defaultPrinterName || 'Nenhuma'}`);
          } catch {
            results.push('Status: ❌ Erro ao consultar');
          }
        } else {
          // Fallback to individual calls
          try {
            const printers = await window.foodhub.getPrinters();
            results.push(`Impressoras: ${printers.length} encontrada(s)`);
            if (printers.length > 0) results.push(`Lista: ${printers.join(', ')}`);
          } catch {
            results.push('Impressoras: ❌ Erro ao listar');
          }

          try {
            const defaultPrinter = await window.foodhub.getDefaultPrinter();
            results.push(`Padrão: ${defaultPrinter || 'Nenhuma definida'}`);
          } catch {
            results.push('Padrão: ❌ Erro ao consultar');
          }
        }
      } else {
        results.push('Desktop PDV: ❌ Não está rodando no FoodHub PDV Desktop');
        results.push('💡 Baixe o FoodHub PDV Desktop para impressão 1 clique.');
      }

      // Route info
      const caixaRoute = findCaixaRoute();
      if (caixaRoute) {
        results.push(`Rota Caixa: route_key="${caixaRoute.route_key}", printers=[${caixaRoute.printers.join(', ') || '(padrão OS)'}]`);
      } else {
        results.push('Rota Caixa: ❌ Não encontrada');
      }

      toast({
        title: '🔍 Diagnóstico de Impressão',
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

        {/* Desktop fallback: app not detected */}
        {showDesktopFallback && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              ⚠️ FoodHub PDV Desktop não detectado
            </p>
            <p className="text-xs text-muted-foreground">
              Para impressão 1 clique, abra o sistema pelo app Desktop. Ou use a impressão pelo navegador.
            </p>
            <div className="flex flex-col gap-2">
              {desktopUrls.windows_url && desktopUrls.windows_url !== '#' ? (
                <Button size="sm" onClick={() => window.open(desktopUrls.windows_url, '_blank')}>
                  <Download className="h-4 w-4 mr-2" /> Baixar FoodHub PDV Desktop
                </Button>
              ) : (
                <Button size="sm" onClick={() => window.open('/downloads', '_blank')}>
                  <Download className="h-4 w-4 mr-2" /> Ver página de download
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDesktopFallback(false);
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
                }}
              >
                <Printer className="h-4 w-4 mr-2" /> Imprimir pelo navegador
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
          <Button className="flex-1" onClick={handlePrint} disabled={isPrinting || showDesktopFallback}>
            {isPrinting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            {isPrinting ? 'Imprimindo...' : 'Imprimir'}
          </Button>
        </div>

        {settings?.print_mode === 'desktop' && (
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
            {window.foodhub ? 'Diagnóstico da Impressora' : 'Verificar Ambiente Desktop'}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
