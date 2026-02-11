import { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, CheckCircle } from 'lucide-react';
import { ReceiptPrint } from './ReceiptPrint';
import type { CartItem } from '@/types/database';
import { getPrinterConfig } from '@/components/settings/PrinterSettings';
import { printReceiptHTML, buildReceiptHTML, type PaperWidthMM } from '@/lib/thermalPrint';
import { useTenantPrintSettings } from '@/hooks/useTenantPrintSettings';

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
  const { printViaAgent } = useTenantPrintSettings();

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
    const { html, paperWidth } = buildHTML();

    // Try agent first, fallback to browser
    const agentOk = await printViaAgent(html);
    if (!agentOk) {
      printReceiptHTML(html, paperWidth);
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
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
