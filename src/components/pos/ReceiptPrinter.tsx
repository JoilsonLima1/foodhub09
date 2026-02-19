import { forwardRef } from 'react';
import type { CartItem } from '@/types/database';

interface ReceiptPrinterProps {
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

export const ReceiptPrinter = forwardRef<HTMLDivElement, ReceiptPrinterProps>(
  ({ orderNumber, items, subtotal, total, paymentMethod, cashierName, tenantName = 'FoodHub09', tenantLogo }, ref) => {
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
      <div
        id="printable-area"
        ref={ref}
        className="receipt-content p-3 bg-white text-black font-mono text-sm"
        style={{ width: '80mm', maxWidth: '80mm', margin: '0 auto' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
          {tenantLogo && (
            <img src={tenantLogo} alt={tenantName} style={{ height: '12mm', width: 'auto', margin: '0 auto 4px', display: 'block', filter: 'grayscale(1) contrast(2)' }} />
          )}
          <div style={{ fontSize: '14pt', fontWeight: 'bold' }}>{tenantName}</div>
          <div style={{ fontSize: '8pt', color: '#666' }}>Cupom não fiscal</div>
        </div>

        {/* Order Info */}
        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Pedido:</span>
            <span style={{ fontWeight: 'bold' }}>#{orderNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#555' }}>
            <span>Data:</span>
            <span>{dateStr} {timeStr}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#555' }}>
            <span>Operador:</span>
            <span>{cashierName}</span>
          </div>
        </div>

        {/* Items */}
        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ fontSize: '8pt', fontWeight: 'bold', marginBottom: '4px', color: '#555' }}>ITENS</div>
          {items.map((item, index) => (
            <div key={item.id} style={{ marginBottom: '6px' }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {index + 1}. {item.productName}{item.variationName && ` (${item.variationName})`}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', paddingLeft: '10px' }}>
                <span>{item.quantity}x {formatCurrency(item.unitPrice)}</span>
                <span>{formatCurrency(item.totalPrice)}</span>
              </div>
              {item.notes && (
                <div style={{ fontSize: '8pt', color: '#666', paddingLeft: '10px', fontStyle: 'italic' }}>
                  Obs: {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13pt', fontWeight: 'bold', marginTop: '4px' }}>
            <span>TOTAL:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Payment */}
        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Pagamento:</span>
            <span>{paymentMethodLabels[paymentMethod] || paymentMethod}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '8pt', color: '#666', marginTop: '12px', pageBreakAfter: 'always' }}>
          <div>Obrigado pela preferência!</div>
          <div style={{ marginTop: '4px' }}>Volte sempre!</div>
        </div>
      </div>
    );
  }
);

ReceiptPrinter.displayName = 'ReceiptPrinter';

/** Build the full HTML string for printing in a new window — removes ALL browser headers */
export function buildPrintWindow(props: ReceiptPrinterProps): string {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const payLabel = paymentMethodLabels[props.paymentMethod] || props.paymentMethod;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const itemsHtml = props.items.map((item, index) => `
    <div style="margin-bottom:6px">
      <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${index + 1}. ${item.productName}${item.variationName ? ` (${item.variationName})` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:8pt;padding-left:10px">
        <span>${item.quantity}x ${formatCurrency(item.unitPrice)}</span>
        <span>${formatCurrency(item.totalPrice)}</span>
      </div>
      ${item.notes ? `<div style="font-size:8pt;color:#666;padding-left:10px;font-style:italic">Obs: ${item.notes}</div>` : ''}
    </div>
  `).join('');

  const logoHtml = props.tenantLogo
    ? `<img src="${props.tenantLogo}" alt="${props.tenantName}" style="height:12mm;width:auto;margin:0 auto 4px;display:block;filter:grayscale(1) contrast(2)">`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cupom</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: 80mm auto;
      margin: 0;
    }
    html, body {
      width: 80mm;
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: 9pt;
      color: #000;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt {
      width: 80mm;
      padding: 3mm 2mm;
    }
    .center { text-align: center; }
    .row { display: flex; justify-content: space-between; }
    .sep { border: none; border-top: 1px dashed #999; margin: 6px 0; }
    .bold { font-weight: bold; }
    .small { font-size: 8pt; color: #555; }
    .italic { font-style: italic; }
    .pl { padding-left: 10px; }
    .lg { font-size: 13pt; font-weight: bold; margin-top: 4px; }
    .footer { text-align: center; font-size: 8pt; color: #666; margin-top: 12px; page-break-after: always; }
    @media print {
      body * { visibility: visible; }
    }
  </style>
</head>
<body>
<div class="receipt">
  <div class="center" style="border-bottom:1px dashed #999;padding-bottom:8px;margin-bottom:8px">
    ${logoHtml}
    <div class="bold" style="font-size:13pt">${props.tenantName || 'FoodHub09'}</div>
    <div class="small">Cupom não fiscal</div>
  </div>

  <div style="border-bottom:1px dashed #999;padding-bottom:8px;margin-bottom:8px">
    <div class="row"><span>Pedido:</span><span class="bold">#${props.orderNumber}</span></div>
    <div class="row small"><span>Data:</span><span>${dateStr} ${timeStr}</span></div>
    <div class="row small"><span>Operador:</span><span>${props.cashierName}</span></div>
  </div>

  <div style="border-bottom:1px dashed #999;padding-bottom:8px;margin-bottom:8px">
    <div class="small bold" style="margin-bottom:4px">ITENS</div>
    ${itemsHtml}
  </div>

  <div style="border-bottom:1px dashed #999;padding-bottom:8px;margin-bottom:8px">
    <div class="row"><span>Subtotal:</span><span>${formatCurrency(props.subtotal)}</span></div>
    <div class="row lg"><span>TOTAL:</span><span>${formatCurrency(props.total)}</span></div>
  </div>

  <div style="border-bottom:1px dashed #999;padding-bottom:8px;margin-bottom:8px">
    <div class="row"><span>Pagamento:</span><span>${payLabel}</span></div>
  </div>

  <div class="footer">
    <div>Obrigado pela preferência!</div>
    <div style="margin-top:4px">Volte sempre!</div>
  </div>
</div>
<script>
  window.onload = function() {
    window.print();
    setTimeout(function() { window.close(); }, 500);
  };
</script>
</body>
</html>`;
}

/** Open new print window — no browser headers (URL, date, title) */
export function printReceipt(props: ReceiptPrinterProps): void {
  const html = buildPrintWindow(props);
  const win = window.open('', '_blank', 'width=320,height=600,toolbar=0,menubar=0,location=0,status=0');
  if (!win) {
    // Fallback: inject inline if popup blocked
    const printFrame = document.createElement('iframe');
    printFrame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:80mm;height:0;border:none;';
    document.body.appendChild(printFrame);
    const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        printFrame.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printFrame), 1000);
      }, 300);
    }
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
