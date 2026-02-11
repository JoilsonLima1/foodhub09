import { forwardRef } from 'react';
import type { CartItem } from '@/types/database';

interface ReceiptPrintProps {
  orderNumber: number;
  items: CartItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  cashierName: string;
  tenantName?: string;
  tenantLogo?: string | null;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  voucher: 'Voucher',
  mixed: 'Misto',
};

export const ReceiptPrint = forwardRef<HTMLDivElement, ReceiptPrintProps>(
  ({ orderNumber, items, subtotal, total, paymentMethod, cashierName, tenantName = 'FoodHub09', tenantLogo }, ref) => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
      <div ref={ref} className="receipt-print p-4 bg-white text-black font-mono text-sm max-w-[300px] mx-auto">
        {/* Header with Logo */}
        <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
          {tenantLogo && (
            <img src={tenantLogo} alt={tenantName} className="h-12 w-auto mx-auto mb-2" />
          )}
          <h1 className="text-lg font-bold">{tenantName}</h1>
          <p className="text-xs text-gray-600">Cupom não fiscal</p>
        </div>

        {/* Order Info */}
        <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
          <div className="flex justify-between">
            <span>Pedido:</span>
            <span className="font-bold">#{orderNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Data:</span>
            <span>{dateStr} {timeStr}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Operador:</span>
            <span>{cashierName}</span>
          </div>
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
          <div className="text-xs font-bold mb-2 text-gray-600">ITENS</div>
          {items.map((item, index) => (
            <div key={item.id} className="mb-2">
              <div className="flex justify-between">
                <span className="flex-1 truncate">
                  {index + 1}. {item.productName}
                  {item.variationName && ` (${item.variationName})`}
                </span>
              </div>
              <div className="flex justify-between text-xs pl-3">
                <span>{item.quantity}x {formatCurrency(item.unitPrice)}</span>
                <span>{formatCurrency(item.totalPrice)}</span>
              </div>
              {item.notes && (
                <div className="text-xs text-gray-500 pl-3 italic">
                  Obs: {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-1">
            <span>TOTAL:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
          <div className="flex justify-between">
            <span>Forma de Pagamento:</span>
            <span>{paymentMethodLabels[paymentMethod] || paymentMethod}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-4">
          <p>Obrigado pela preferência!</p>
          <p className="mt-1">Volte sempre!</p>
        </div>

        {/* Print-only styles — thermal optimized for 58mm/80mm */}
        <style>{`
          @media print {
            @page {
              size: var(--receipt-width, 80mm) auto;
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: var(--receipt-width, 80mm) !important;
              background: #fff !important;
            }
            body * {
              visibility: hidden;
            }
            .receipt-print, .receipt-print * {
              visibility: visible !important;
            }
            .receipt-print {
              position: absolute;
              left: 0;
              top: 0;
              width: var(--receipt-width, 80mm);
              max-width: var(--receipt-width, 80mm);
              padding: 2mm;
              font-size: 9pt;
              font-family: 'Courier New', 'Lucida Console', monospace;
              color: #000 !important;
              background: #fff !important;
              line-height: 1.3;
              transform: none !important;
              zoom: 1 !important;
            }
            .receipt-print img {
              max-height: 12mm;
              filter: grayscale(1) contrast(2);
            }
            .receipt-print .flex {
              display: flex;
            }
            .receipt-print .justify-between {
              justify-content: space-between;
            }
          }
        `}</style>
      </div>
    );
  }
);

ReceiptPrint.displayName = 'ReceiptPrint';
