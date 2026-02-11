import { Router, Request, Response } from 'express';
import { renderAndPrint } from '../print-engine';
import type { AgentConfig } from '../config';

function buildTestReceiptHTML(paperWidth: number): string {
  const w = paperWidth === 58 ? '58mm' : '80mm';
  const fontSize = paperWidth === 58 ? '10px' : '12px';
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR');
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: ${w} auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${w}; margin: 0; padding: 0; background: #fff; color: #000;
    font-family: 'Courier New', monospace; font-size: ${fontSize}; line-height: 1.3; }
  .receipt { width: 100%; padding: 2mm; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .sep { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; }
  .total { font-size: ${paperWidth === 58 ? '14px' : '16px'}; font-weight: bold; }
  .small { font-size: ${paperWidth === 58 ? '8px' : '10px'}; color: #666; }
  .cut { text-align: center; letter-spacing: 2px; color: #999; font-size: 8px; margin: 2mm 0; }
</style></head><body>
<div class="receipt">
  <div class="cut">✂ - - - - - - - - - - - - - - -</div>
  <div class="center" style="border-bottom:1px dashed #000; padding-bottom:6px; margin-bottom:6px;">
    <div style="font-size:16px; font-weight:bold;">FoodHub09</div>
    <div class="small">CUPOM TESTE – NÃO FISCAL</div>
  </div>
  <div style="border-bottom:1px dashed #000; padding-bottom:6px; margin-bottom:6px;">
    <div class="row"><span>Pedido:</span><span class="bold">#999</span></div>
    <div class="row small"><span>Data:</span><span>${date} ${time}</span></div>
    <div class="row small"><span>Operador:</span><span>Teste</span></div>
  </div>
  <div style="border-bottom:1px dashed #000; padding-bottom:6px; margin-bottom:6px;">
    <div class="small bold" style="margin-bottom:4px;">ITENS</div>
    <div style="margin-bottom:4px;">
      <div class="row"><span>1. X-Burguer Especial</span></div>
      <div class="row small" style="padding-left:6px;"><span>2x R$ 25,90</span><span>R$ 51,80</span></div>
    </div>
    <div style="margin-bottom:4px;">
      <div class="row"><span>2. Refrigerante Lata</span></div>
      <div class="row small" style="padding-left:6px;"><span>2x R$ 6,00</span><span>R$ 12,00</span></div>
    </div>
    <div style="margin-bottom:4px;">
      <div class="row"><span>3. Batata Frita Grande</span></div>
      <div class="row small" style="padding-left:6px;"><span>1x R$ 18,50</span><span>R$ 18,50</span></div>
      <div class="small" style="padding-left:6px; font-style:italic;">Obs: Sem sal</div>
    </div>
  </div>
  <div style="border-bottom:1px dashed #000; padding-bottom:6px; margin-bottom:6px;">
    <div class="row"><span>Subtotal:</span><span>R$ 82,30</span></div>
    <div class="row total" style="margin-top:4px;"><span>TOTAL:</span><span>R$ 82,30</span></div>
  </div>
  <div style="border-bottom:1px dashed #000; padding-bottom:6px; margin-bottom:6px;">
    <div class="row"><span>Pagamento:</span><span>PIX</span></div>
  </div>
  <div class="center small" style="margin-top:8px;">
    <div>Obrigado pela preferência!</div>
    <div style="margin-top:2px;">Volte sempre!</div>
  </div>
  <div style="margin-top:8px; border:1px dashed #000; padding:4px; text-align:center;">
    <div class="bold">★ CUPOM TESTE ★</div>
    <div class="small" style="margin-top:2px;">Verifique alinhamento e corte</div>
    <div class="small">Papel: ${w}</div>
  </div>
  <div class="cut" style="margin-top:8px;">✂ - - - - - - - - - - - - - - -</div>
  <div style="padding-bottom:4mm;"></div>
</div>
</body></html>`;
}

export function printRouter(config: AgentConfig) {
  const router = Router();

  // POST /print/test — print a test receipt
  router.post('/print/test', async (req: Request, res: Response) => {
    try {
      const { paperWidth = 80, printerName } = req.body || {};
      const pw = paperWidth === 58 ? 58 : 80;
      const html = buildTestReceiptHTML(pw);
      const printer = printerName || config.defaultPrinter || undefined;

      await renderAndPrint(html, pw, printer);

      res.json({ ok: true, message: 'Cupom de teste impresso com sucesso.' });
    } catch (err) {
      console.error('[Print/Test]', err);
      res.status(500).json({
        ok: false,
        error: (err as Error).message || 'Falha ao imprimir cupom de teste.',
      });
    }
  });

  // POST /print/receipt — print a real receipt
  router.post('/print/receipt', async (req: Request, res: Response) => {
    try {
      const { paperWidth = 80, printerName, html, text } = req.body || {};
      const pw = paperWidth === 58 ? 58 : 80;
      const printer = printerName || config.defaultPrinter || undefined;

      if (!html && !text) {
        return res.status(400).json({ ok: false, error: 'Envie html ou text no body.' });
      }

      // If only text, wrap in basic HTML
      const content = html || `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: ${pw}mm auto; margin: 0; }
  body { width: ${pw}mm; margin: 0; padding: 2mm; font-family: 'Courier New', monospace;
    font-size: ${pw === 58 ? '10px' : '12px'}; white-space: pre-wrap; }
</style></head><body>${text}</body></html>`;

      await renderAndPrint(content, pw, printer);

      res.json({ ok: true, message: 'Cupom impresso com sucesso.' });
    } catch (err) {
      console.error('[Print/Receipt]', err);
      res.status(500).json({
        ok: false,
        error: (err as Error).message || 'Falha ao imprimir cupom.',
      });
    }
  });

  return router;
}
