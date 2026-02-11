import { Router, Request, Response } from 'express';
import { printEscPos, type ReceiptLine } from '../print-engine';
import type { AgentConfig } from '../config';

export function printRouter(config: AgentConfig) {
  const router = Router();

  /**
   * POST /print
   * Body: { printerName?, paperWidth?: 58|80, lines: ReceiptLine[] }
   *
   * Receives structured receipt lines and prints via ESC/POS.
   */
  router.post('/print', async (req: Request, res: Response) => {
    try {
      const {
        printerName,
        nomeDaImpressora,
        paperWidth = 80,
        larguraDoPapel,
        lines,
      } = req.body || {};

      const printer = nomeDaImpressora || printerName || config.defaultPrinter || undefined;
      const pw = (larguraDoPapel || paperWidth) === 58 ? 58 : 80;

      if (!lines || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: 'Envie "lines" (array de linhas do cupom) no body.',
        });
      }

      await printEscPos({
        printerName: printer,
        paperWidth: pw as 58 | 80,
        lines: lines as ReceiptLine[],
      });

      res.json({
        ok: true,
        message: 'Cupom impresso com sucesso via ESC/POS.',
        printer: printer || 'auto',
        paperWidth: pw,
      });
    } catch (err) {
      console.error('[Print]', err);
      const message = (err as Error).message || 'Falha ao imprimir.';
      const code = message.includes('não está acessível')
        ? 'PRINTER_NOT_FOUND'
        : 'PRINT_ERROR';
      res.status(500).json({ ok: false, code, message });
    }
  });

  /**
   * POST /test-print
   * Quick test print to verify connectivity.
   */
  router.post('/test-print', async (req: Request, res: Response) => {
    try {
      const {
        printerName,
        nomeDaImpressora,
        paperWidth = 80,
        larguraDoPapel,
        type = 'caixa',
        tipo,
      } = req.body || {};

      const printer = nomeDaImpressora || printerName || config.defaultPrinter || undefined;
      const pw = (larguraDoPapel || paperWidth) === 58 ? 58 : 80;
      const typeLabel = (tipo || type || 'caixa').toUpperCase();

      const now = new Date();
      const date = now.toLocaleDateString('pt-BR');
      const time = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const lines: ReceiptLine[] = [
        { type: 'separator' },
        { type: 'bold', value: 'FoodHub09', align: 'center' },
        { type: 'text', value: `TESTE DE IMPRESSÃO - ${typeLabel}`, align: 'center' },
        { type: 'separator' },
        { type: 'pair', left: 'Data:', right: `${date} ${time}` },
        { type: 'pair', left: 'Tipo:', right: typeLabel },
        { type: 'pair', left: 'Papel:', right: `${pw}mm` },
        { type: 'separator' },
        { type: 'bold', value: 'ITENS DE EXEMPLO', align: 'left' },
        { type: 'text', value: '1. X-Burguer Especial' },
        { type: 'pair', left: '   2x R$ 25,90', right: 'R$ 51,80' },
        { type: 'text', value: '2. Refrigerante Lata' },
        { type: 'pair', left: '   2x R$ 6,00', right: 'R$ 12,00' },
        { type: 'separator' },
        { type: 'bold', value: '★ CUPOM TESTE OK ★', align: 'center' },
        { type: 'text', value: `${date} ${time}`, align: 'center' },
        { type: 'feed', lines: 3 },
        { type: 'cut' },
      ];

      await printEscPos({
        printerName: printer,
        paperWidth: pw as 58 | 80,
        lines,
      });

      res.json({
        ok: true,
        message: `Teste ${typeLabel} impresso com sucesso via ESC/POS.`,
        printer: printer || 'auto',
      });
    } catch (err) {
      console.error('[TestPrint]', err);
      res.status(500).json({
        ok: false,
        code: 'PRINT_ERROR',
        error: (err as Error).message || 'Falha ao imprimir cupom de teste.',
      });
    }
  });

  return router;
}
