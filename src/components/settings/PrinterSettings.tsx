import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Printer, TestTube, CheckCircle, HelpCircle, Zap, Wifi, WifiOff, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReceiptPrint } from '@/components/pos/ReceiptPrint';
import { PrinterHelpModal } from './PrinterHelpModal';
import { DefaultPrinterCallout } from './DefaultPrinterCallout';
import { useTenantPrintSettings, type TenantPrintSettings } from '@/hooks/useTenantPrintSettings';
import type { CartItem } from '@/types/database';

// Keep backward-compatible exports for ReceiptDialog
export type PaperWidth = '58mm' | '80mm';
export interface PrinterConfig {
  paperWidth: PaperWidth;
  model: string;
  autoPrint: boolean;
}

export function getPrinterConfig(): PrinterConfig {
  try {
    const keys = Object.keys(localStorage);
    const cacheKey = keys.find(k => k.startsWith('printSettings:'));
    if (cacheKey) {
      const cached: TenantPrintSettings = JSON.parse(localStorage.getItem(cacheKey)!);
      return {
        paperWidth: `${cached.paper_width}mm` as PaperWidth,
        model: cached.printer_profile.toLowerCase(),
        autoPrint: cached.print_mode === 'AGENT',
      };
    }
  } catch {}
  try {
    const stored = localStorage.getItem('pos_printer_config');
    if (stored) return JSON.parse(stored);
  } catch {}
  return { paperWidth: '80mm', model: 'generic', autoPrint: false };
}

const PRINTER_PROFILES = [
  { value: 'GENERIC', label: 'Genérica (Compatível ESC/POS)' },
  { value: 'EPSON', label: 'Epson (TM-T20, TM-T88)' },
  { value: 'ELGIN', label: 'Elgin (i7, i9)' },
  { value: 'BEMATECH', label: 'Bematech (MP-4200 TH)' },
  { value: 'DARUMA', label: 'Daruma (DR800)' },
  { value: 'TOMATE', label: 'Tomate / Tanca / Jetway' },
];

const sampleItems: CartItem[] = [
  { id: '1', productId: 'p1', productName: 'X-Burguer Especial', quantity: 2, unitPrice: 25.90, totalPrice: 51.80, addons: [] },
  { id: '2', productId: 'p2', productName: 'Refrigerante Lata', variationName: 'Coca-Cola', quantity: 2, unitPrice: 6.00, totalPrice: 12.00, addons: [] },
  { id: '3', productId: 'p3', productName: 'Batata Frita Grande', quantity: 1, unitPrice: 18.50, totalPrice: 18.50, notes: 'Sem sal', addons: [] },
];

export function PrinterSettings() {
  const { toast } = useToast();
  const { settings, isLoading, isSaving, isOffline, save, testAgent } = useTenantPrintSettings();
  const [local, setLocal] = useState<TenantPrintSettings | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [testingAgent, setTestingAgent] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Sync local state when DB settings load
  useEffect(() => {
    if (settings && !local) {
      setLocal({ ...settings });
    }
  }, [settings, local]);

  if (isLoading || !local) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const update = (partial: Partial<TenantPrintSettings>) => {
    setLocal(prev => prev ? { ...prev, ...partial } : prev);
  };

  const handleSave = () => {
    save({
      paper_width: local.paper_width,
      printer_profile: local.printer_profile,
      print_mode: local.print_mode,
      agent_endpoint: local.agent_endpoint,
    });
  };

  const handleTestPrint = () => {
    handleSave();
    document.documentElement.style.setProperty('--receipt-width', `${local.paper_width}mm`);
    setShowPreview(true);
    setTimeout(() => window.print(), 300);
  };

  const handleTestAgent = async () => {
    if (!local.agent_endpoint) {
      toast({ title: 'Endpoint não configurado', variant: 'destructive' });
      return;
    }
    setTestingAgent(true);
    const ok = await testAgent(local.agent_endpoint);
    setTestingAgent(false);
    toast({
      title: ok ? 'Agente conectado!' : 'Agente não encontrado',
      description: ok
        ? 'O FoodHub Print está respondendo.'
        : `Não foi possível conectar em ${local.agent_endpoint}`,
      variant: ok ? 'default' : 'destructive',
    });
  };

  return (
    <div className="space-y-6">
      {isOffline && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <WifiOff className="h-3.5 w-3.5" />
          Sem sincronização no momento. Configurações salvas apenas neste dispositivo.
        </div>
      )}

      <DefaultPrinterCallout />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Impressora Térmica
              </CardTitle>
              <CardDescription>Configure sua impressora térmica para impressão de cupons</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)}>
              <HelpCircle className="h-4 w-4 mr-1" /> Ajuda
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paper Width */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Largura do Papel</Label>
            <RadioGroup
              value={local.paper_width}
              onValueChange={(v: '58' | '80') => update({ paper_width: v })}
              className="grid gap-3 grid-cols-2"
            >
              <div className="relative">
                <RadioGroupItem value="58" id="paper-58" className="peer sr-only" />
                <Label htmlFor="paper-58" className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                  <span className="text-2xl font-bold">58mm</span>
                  <span className="text-xs text-muted-foreground text-center">~32 caracteres por linha</span>
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem value="80" id="paper-80" className="peer sr-only" />
                <Label htmlFor="paper-80" className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                  <span className="text-2xl font-bold">80mm</span>
                  <span className="text-xs text-muted-foreground text-center">~42 caracteres por linha</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Printer Profile */}
          <div className="space-y-2">
            <Label>Modelo da Impressora</Label>
            <Select value={local.printer_profile} onValueChange={(v) => update({ printer_profile: v as TenantPrintSettings['printer_profile'] })}>
              <SelectTrigger><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
              <SelectContent>
                {PRINTER_PROFILES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Se não encontrar seu modelo, use "Genérica (Compatível ESC/POS)"</p>
          </div>
        </CardContent>
      </Card>

      {/* Agent Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" /> Impressão 1-Clique (Opcional)
          </CardTitle>
          <CardDescription>
            Requer instalar o FoodHub Print no computador. Após instalado, o botão imprimir sai direto sem janela.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar modo Agent</Label>
              <p className="text-xs text-muted-foreground">Impressão direta sem diálogo do navegador</p>
            </div>
            <Switch
              checked={local.print_mode === 'AGENT'}
              onCheckedChange={(checked) => update({ print_mode: checked ? 'AGENT' : 'BROWSER' })}
            />
          </div>

          {local.print_mode === 'AGENT' && (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-2">
                <Label>Endpoint do Agente</Label>
                <div className="flex gap-2">
                  <Input
                    value={local.agent_endpoint || 'http://127.0.0.1:9123'}
                    onChange={(e) => update({ agent_endpoint: e.target.value })}
                    placeholder="http://127.0.0.1:9123"
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={handleTestAgent} disabled={testingAgent}>
                    {testingAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <a href="/downloads" target="_blank" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Baixar FoodHub Print Agent
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} className="flex-1 sm:flex-none" disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Salvar Configurações
        </Button>
        <Button variant="outline" onClick={handleTestPrint} className="flex-1 sm:flex-none">
          <TestTube className="h-4 w-4 mr-2" /> Imprimir Cupom de Teste
        </Button>
      </div>

      {/* Test receipt preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pré-visualização ({local.paper_width}mm)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`mx-auto border rounded bg-white ${local.paper_width === '58' ? 'max-w-[220px]' : 'max-w-[300px]'}`}>
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

      <PrinterHelpModal open={showHelp} onOpenChange={setShowHelp} />
    </div>
  );
}
