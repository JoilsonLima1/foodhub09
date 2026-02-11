import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, TestTube, CheckCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReceiptPrint } from '@/components/pos/ReceiptPrint';
import type { CartItem } from '@/types/database';

export type PaperWidth = '58mm' | '80mm';

export interface PrinterConfig {
  paperWidth: PaperWidth;
  model: string;
  autoPrint: boolean;
}

const PRINTER_MODELS = [
  { value: 'generic', label: 'Genérica (Compatível ESC/POS)' },
  { value: 'epson_tm20', label: 'Epson TM-T20' },
  { value: 'epson_tm88', label: 'Epson TM-T88' },
  { value: 'elgin_i9', label: 'Elgin i9' },
  { value: 'elgin_i7', label: 'Elgin i7' },
  { value: 'bematech_mp4200', label: 'Bematech MP-4200 TH' },
  { value: 'daruma_dr800', label: 'Daruma DR800' },
  { value: 'tanca_tp650', label: 'Tanca TP-650' },
  { value: 'jetway_jp500', label: 'Jetway JP-500' },
];

const STORAGE_KEY = 'pos_printer_config';

function loadConfig(): PrinterConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { paperWidth: '80mm', model: 'generic', autoPrint: false };
}

function saveConfig(config: PrinterConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getPrinterConfig(): PrinterConfig {
  return loadConfig();
}

const sampleItems: CartItem[] = [
  { id: '1', productId: 'p1', productName: 'X-Burguer Especial', quantity: 2, unitPrice: 25.90, totalPrice: 51.80, addons: [] },
  { id: '2', productId: 'p2', productName: 'Refrigerante Lata', variationName: 'Coca-Cola', quantity: 2, unitPrice: 6.00, totalPrice: 12.00, addons: [] },
  { id: '3', productId: 'p3', productName: 'Batata Frita Grande', quantity: 1, unitPrice: 18.50, totalPrice: 18.50, notes: 'Sem sal', addons: [] },
];

export function PrinterSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<PrinterConfig>(loadConfig);
  const [showPreview, setShowPreview] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    saveConfig(config);
    toast({
      title: 'Configurações salvas',
      description: `Impressora configurada para papel ${config.paperWidth}.`,
    });
  };

  const handleTestPrint = () => {
    saveConfig(config);
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Impressora Térmica
          </CardTitle>
          <CardDescription>
            Configure sua impressora térmica para impressão de cupons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paper Width */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Largura do Papel</Label>
            <RadioGroup
              value={config.paperWidth}
              onValueChange={(value: PaperWidth) =>
                setConfig(prev => ({ ...prev, paperWidth: value }))
              }
              className="grid gap-3 grid-cols-2"
            >
              <div className="relative">
                <RadioGroupItem value="58mm" id="paper-58" className="peer sr-only" />
                <Label
                  htmlFor="paper-58"
                  className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                >
                  <span className="text-2xl font-bold">58mm</span>
                  <span className="text-xs text-muted-foreground text-center">
                    ~32 caracteres por linha
                  </span>
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem value="80mm" id="paper-80" className="peer sr-only" />
                <Label
                  htmlFor="paper-80"
                  className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                >
                  <span className="text-2xl font-bold">80mm</span>
                  <span className="text-xs text-muted-foreground text-center">
                    ~42 caracteres por linha
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Printer Model */}
          <div className="space-y-2">
            <Label>Modelo da Impressora</Label>
            <Select
              value={config.model}
              onValueChange={(value) => setConfig(prev => ({ ...prev, model: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                {PRINTER_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se não encontrar seu modelo, use "Genérica (Compatível ESC/POS)"
            </p>
          </div>

          {/* Info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-medium">Como configurar:</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Instale a impressora no Windows/macOS normalmente</li>
                  <li>Selecione a largura do papel acima (58mm ou 80mm)</li>
                  <li>Clique em "Imprimir Teste" para verificar o layout</li>
                  <li>Na janela de impressão do navegador, selecione sua impressora térmica</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} className="flex-1 sm:flex-none">
          <CheckCircle className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
        <Button variant="outline" onClick={handleTestPrint} className="flex-1 sm:flex-none">
          <TestTube className="h-4 w-4 mr-2" />
          Imprimir Teste
        </Button>
      </div>

      {/* Preview for test print (hidden on screen, visible on print) */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pré-visualização do Cupom ({config.paperWidth})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`mx-auto border rounded bg-white ${config.paperWidth === '58mm' ? 'max-w-[220px]' : 'max-w-[300px]'}`}>
              <ReceiptPrint
                ref={receiptRef}
                orderNumber={999}
                items={sampleItems}
                subtotal={82.30}
                total={82.30}
                paymentMethod="pix"
                cashierName="Teste"
                tenantName="Meu Estabelecimento"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
