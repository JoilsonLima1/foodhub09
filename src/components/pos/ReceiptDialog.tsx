import { useRef, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, CheckCircle, Loader2 } from 'lucide-react';
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
  const { printViaAgent, settings } = useTenantPrintSettings();
  const { routes } = usePrinterRoutes();
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);

  // Apply paper width CSS variable from config
  useEffect(() => {
    if (open) {
      const config = getPrinterConfig();
      document.documentElement.style.setProperty('--receipt-width', config.paperWidth);
    }
  }, [open]);

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

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const { html, paperWidth } = buildHTML();

      // Find "caixa" printer route
      const caixaRoute = routes.find(
        r => r.route_type === 'caixa' || r.label.toLowerCase() === 'caixa'
      );

      // Attempt agent print if mode is AGENT
      if (settings?.print_mode === 'AGENT' && settings?.agent_endpoint) {
        const result = await printViaAgent(html, {
          printerName: caixaRoute?.printer_name,
          paperWidth: caixaRoute?.paper_width || String(paperWidth),
        });

        if (result.ok) {
          toast({
            title: '✓ Enviado para impressão (Agent)',
            description: caixaRoute?.printer_name
              ? `Impressora: ${caixaRoute.printer_name}`
              : 'Impressora padrão',
          });
          return;
        }

        // Show error and fallback
        if (result.error) {
          const isOffline = result.error === 'AGENT_OFFLINE';
          toast({
            title: isOffline ? 'Agent offline' : 'Erro na impressão',
            description: isOffline
              ? 'Usando impressão pelo navegador como fallback.'
              : result.error,
            variant: 'destructive',
          });
        }
      }

      // Fallback: browser print
      printReceiptHTML(html, paperWidth);
    } finally {
      setIsPrinting(false);
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
      </DialogContent>
    </Dialog>
  );
}
