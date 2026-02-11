/**
 * Thermal printing utility — renders receipt HTML in a hidden iframe
 * with proper @page CSS for 58mm/80mm thermal printers, then calls print().
 * Works with Chrome --kiosk-printing for silent printing.
 */

export type PaperWidthMM = '58' | '80';

function getThermalCSS(paperWidth: PaperWidthMM): string {
  const widthMM = paperWidth === '58' ? '58mm' : '80mm';
  return `
    @page {
      size: ${widthMM} auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${widthMM};
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: ${paperWidth === '58' ? '10px' : '12px'};
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt {
      width: 100%;
      padding: 2mm;
    }
    .receipt img {
      max-height: 12mm;
      filter: grayscale(1) contrast(2);
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-xs { font-size: ${paperWidth === '58' ? '8px' : '10px'}; }
    .font-bold { font-weight: bold; }
    .mb-1 { margin-bottom: 2px; }
    .mb-2 { margin-bottom: 4px; }
    .mb-3 { margin-bottom: 6px; }
    .mt-1 { margin-top: 2px; }
    .mt-2 { margin-top: 4px; }
    .mt-4 { margin-top: 8px; }
    .py-2 { padding-top: 4px; padding-bottom: 4px; }
    .italic { font-style: italic; }
    .pl-3 { padding-left: 6px; }
    .separator {
      border: none;
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 4px;
    }
    .row .label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .total-row {
      font-size: ${paperWidth === '58' ? '14px' : '16px'};
      font-weight: bold;
    }
    .cut-line {
      text-align: center;
      letter-spacing: 2px;
      color: #999;
      font-size: 8px;
      margin: 2mm 0;
    }
  `;
}

/**
 * Print receipt HTML inside a hidden iframe.
 * After print dialog is triggered/dismissed, the iframe is removed.
 */
export function printReceiptHTML(html: string, paperWidth: PaperWidthMM): void {
  // Remove any previous print iframe
  const existing = document.getElementById('thermal-print-frame');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'thermal-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${getThermalCSS(paperWidth)}</style>
</head>
<body>
  <div class="receipt">${html}</div>
</body>
</html>`);
  doc.close();

  // Wait for content to render then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove iframe after a delay to allow print dialog to open
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }, 200);
  };
}

/**
 * Build receipt HTML from structured data.
 */
export interface ReceiptData {
  tenantName: string;
  tenantLogo?: string | null;
  orderNumber: number;
  dateStr: string;
  timeStr: string;
  cashierName: string;
  items: Array<{
    index: number;
    name: string;
    variationName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }>;
  subtotal: number;
  total: number;
  paymentMethodLabel: string;
  isTest?: boolean;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function buildReceiptHTML(data: ReceiptData): string {
  const itemsHTML = data.items.map((item) => {
    let html = `<div class="mb-2">
      <div class="row">
        <span class="label">${item.index}. ${item.name}${item.variationName ? ` (${item.variationName})` : ''}</span>
      </div>
      <div class="row text-xs pl-3">
        <span>${item.quantity}x ${formatBRL(item.unitPrice)}</span>
        <span>${formatBRL(item.totalPrice)}</span>
      </div>`;
    if (item.notes) {
      html += `<div class="text-xs pl-3 italic" style="color:#666;">Obs: ${item.notes}</div>`;
    }
    html += '</div>';
    return html;
  }).join('');

  return `
    <div class="cut-line">✂ - - - - - - - - - - - - - - -</div>
    
    <div class="text-center mb-3" style="border-bottom:1px dashed #000; padding-bottom:6px;">
      ${data.tenantLogo ? `<img src="${data.tenantLogo}" alt="${data.tenantName}" style="height:12mm; margin:0 auto 4px;" />` : ''}
      <div style="font-size:16px; font-weight:bold;">${data.tenantName}</div>
      <div class="text-xs" style="color:#666;">${data.isTest ? 'CUPOM TESTE – NÃO FISCAL' : 'Cupom não fiscal'}</div>
    </div>

    <div class="mb-3" style="border-bottom:1px dashed #000; padding-bottom:6px;">
      <div class="row"><span>Pedido:</span><span class="font-bold">#${data.orderNumber}</span></div>
      <div class="row text-xs"><span>Data:</span><span>${data.dateStr} ${data.timeStr}</span></div>
      <div class="row text-xs"><span>Operador:</span><span>${data.cashierName}</span></div>
    </div>

    <div class="mb-3" style="border-bottom:1px dashed #000; padding-bottom:6px;">
      <div class="text-xs font-bold mb-2" style="color:#666;">ITENS</div>
      ${itemsHTML}
    </div>

    <div class="mb-3" style="border-bottom:1px dashed #000; padding-bottom:6px;">
      <div class="row"><span>Subtotal:</span><span>${formatBRL(data.subtotal)}</span></div>
      <div class="row total-row mt-1"><span>TOTAL:</span><span>${formatBRL(data.total)}</span></div>
    </div>

    <div class="mb-3" style="border-bottom:1px dashed #000; padding-bottom:6px;">
      <div class="row"><span>Pagamento:</span><span>${data.paymentMethodLabel}</span></div>
    </div>

    <div class="text-center text-xs mt-4" style="color:#666;">
      <div>Obrigado pela preferência!</div>
      <div class="mt-1">Volte sempre!</div>
    </div>

    ${data.isTest ? `
    <div class="mt-4 text-center" style="border:1px dashed #000; padding:4px;">
      <div class="font-bold">★ CUPOM TESTE ★</div>
      <div class="text-xs mt-1">Verifique alinhamento e corte</div>
      <div class="text-xs">Ajuste densidade no painel da impressora</div>
    </div>` : ''}

    <div class="cut-line mt-4">✂ - - - - - - - - - - - - - - -</div>
    <div style="padding-bottom:4mm;"></div>
  `;
}
