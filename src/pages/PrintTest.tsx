import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrintTest() {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) {
      alert('Popup bloqueado! Permita popups para este site.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Cupom Teste</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              margin: 0 auto;
              padding: 2mm;
              font-size: 12px;
              color: #000;
            }
            .centro { text-align: center; }
            .linha { border-bottom: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .total { font-size: 16px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; }
            td:last-child { text-align: right; }
          </style>
        </head>
        <body>
          <h3 class="centro">FoodHub PDV</h3>
          <p class="centro" style="font-size:10px;color:#666;">CUPOM TESTE - NÃO FISCAL</p>
          <div class="linha"></div>

          <div class="row"><span>Pedido:</span><span class="bold">#9999</span></div>
          <div class="row" style="font-size:10px;"><span>Data:</span><span>${new Date().toLocaleString('pt-BR')}</span></div>
          <div class="row" style="font-size:10px;"><span>Operador:</span><span>Teste</span></div>
          <div class="linha"></div>

          <p class="bold" style="font-size:10px;color:#666;">ITENS</p>
          <table>
            <tr><td>1. X-Burguer Especial</td></tr>
            <tr><td style="padding-left:12px;font-size:10px;">2x R$ 25,90</td><td>R$ 51,80</td></tr>
            <tr><td>2. Refrigerante Lata</td></tr>
            <tr><td style="padding-left:12px;font-size:10px;">2x R$ 6,00</td><td>R$ 12,00</td></tr>
            <tr><td>3. Batata Frita G</td></tr>
            <tr><td style="padding-left:12px;font-size:10px;">1x R$ 18,50</td><td>R$ 18,50</td></tr>
          </table>
          <div class="linha"></div>

          <div class="row"><span>Subtotal:</span><span>R$ 82,30</span></div>
          <div class="row total"><span>TOTAL:</span><span>R$ 82,30</span></div>
          <div class="linha"></div>

          <div class="row"><span>Pagamento:</span><span>Dinheiro</span></div>
          <div class="linha"></div>

          <div class="centro" style="font-size:10px;color:#666;margin-top:8px;">
            <p>Obrigado pela preferência!</p>
            <p>Volte sempre!</p>
          </div>

          <div class="centro bold" style="margin-top:12px;border:1px dashed #000;padding:4px;">
            ★ CUPOM TESTE OK ★
          </div>

          <div style="padding-bottom:8mm;"></div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Aguarda renderizar, depois imprime
    setTimeout(() => {
      printWindow.print();
      // Fecha após um delay para o diálogo de impressão abrir
      setTimeout(() => printWindow.close(), 2000);
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Teste de Impressão</h1>
        <p className="text-muted-foreground">Clique no botão para testar a impressão via navegador</p>
        <Button size="lg" onClick={handlePrint} className="gap-2">
          <Printer className="h-5 w-5" />
          Imprimir Cupom Teste
        </Button>
        <p className="text-xs text-muted-foreground">
          Dica: Se o popup for bloqueado, permita popups para este site.
        </p>
      </div>
    </div>
  );
}
