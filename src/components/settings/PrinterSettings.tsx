import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, TestTube, CheckCircle, HelpCircle, Loader2, Monitor, Smartphone, Search, Plus, Trash2, WifiOff, Download } from 'lucide-react';
import { usePrinterRoutes } from '@/hooks/usePrinterRoutes';
import { useToast } from '@/hooks/use-toast';
import { ReceiptPrint } from '@/components/pos/ReceiptPrint';
import { PrinterHelpModal } from './PrinterHelpModal';
import { DefaultPrinterCallout } from './DefaultPrinterCallout';
import { useTenantPrintSettings, type TenantPrintSettings } from '@/hooks/useTenantPrintSettings';
import { usePrintAgentSettings } from '@/hooks/usePrintAgentSettings';
import { printReceiptHTML, buildReceiptHTML, type PaperWidthMM } from '@/lib/thermalPrint';
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
        autoPrint: cached.print_mode === 'desktop',
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
  const { settings, isLoading, isSaving, isOffline, save } = useTenantPrintSettings();
  const { data: desktopUrls } = usePrintAgentSettings();
  const { routes, isLoading: routesLoading, isSaving: routesSaving, addRoute, updateRoute, removeRoute } = usePrinterRoutes();
  const [local, setLocal] = useState<TenantPrintSettings | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Desktop bridge printer detection
  const [detectedPrinters, setDetectedPrinters] = useState<string[]>([]);
  const [defaultPrinter, setDefaultPrinter] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [testingType, setTestingType] = useState<string | null>(null);
  const [newRouteLabel, setNewRouteLabel] = useState('');

  const hasDesktopBridge = typeof window !== 'undefined' && !!window.foodhub;

  const detectPrintersViaBridge = async () => {
    if (!window.foodhub) return;
    setIsDetecting(true);
    try {
      const printers = await window.foodhub.getPrinters();
      const defPrinter = await window.foodhub.getDefaultPrinter();
      setDetectedPrinters(printers);
      setDefaultPrinter(defPrinter || null);
      toast({
        title: `${printers.length} impressora(s) detectada(s)`,
        description: defPrinter ? `Padrão: ${defPrinter}` : 'Nenhuma impressora padrão identificada.',
      });
    } catch {
      setDetectedPrinters([]);
      toast({
        title: 'Erro ao listar impressoras',
        description: 'Não foi possível consultar as impressoras via Desktop PDV.',
        variant: 'destructive',
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleTestPrintForRoute = async (routeId: string, routeType: string, printerName: string | null) => {
    if (!local || !window.foodhub) return;
    setTestingType(routeId);
    try {
      const pw = Number(local.paper_width) === 58 ? 58 : 80;
      const result = await window.foodhub.printReceipt({
        lines: [
          { type: 'bold', value: `TESTE - ${routeType.toUpperCase()}`, align: 'center' },
          { type: 'separator' },
          { type: 'text', value: `Impressora: ${printerName || 'padrão'}` },
          { type: 'text', value: `Papel: ${pw}mm` },
          { type: 'separator' },
          { type: 'text', value: 'Se leu isto, está funcionando!', align: 'center' },
          { type: 'feed', lines: 3 },
          { type: 'cut' },
        ],
        printerName: printerName || undefined,
        paperWidth: pw,
      });
      if (result.ok) {
        toast({ title: `✓ Teste ${routeType} enviado`, description: `Impressora: ${printerName || 'padrão'}` });
      } else {
        throw new Error(result.error || 'Erro');
      }
    } catch (err) {
      toast({
        title: `Falha no teste ${routeType}`,
        description: (err as Error).message || 'Erro ao imprimir.',
        variant: 'destructive',
      });
    } finally {
      setTestingType(null);
    }
  };

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
      default_printer_name: local.default_printer_name,
      kitchen_printer_name: local.kitchen_printer_name,
      bar_printer_name: local.bar_printer_name,
    });
  };

  const handleTestPrint = () => {
    handleSave();
    const paperWidth = local.paper_width as PaperWidthMM;

    // Desktop bridge test
    if (local.print_mode === 'desktop' && window.foodhub?.printReceipt) {
      const pw = Number(local.paper_width) === 58 ? 58 : 80;
      window.foodhub.printReceipt({
        lines: [
          { type: 'bold', value: 'CUPOM DE TESTE', align: 'center' },
          { type: 'separator' },
          { type: 'text', value: 'Pedido #999' },
          { type: 'pair', left: '2x X-Burguer', right: 'R$ 51,80' },
          { type: 'pair', left: '2x Refrigerante', right: 'R$ 12,00' },
          { type: 'pair', left: '1x Batata Frita', right: 'R$ 18,50' },
          { type: 'separator' },
          { type: 'bold', value: 'TOTAL: R$ 82,30', align: 'right' },
          { type: 'feed', lines: 3 },
          { type: 'cut' },
        ],
        printerName: local.default_printer_name || undefined,
        paperWidth: pw,
      }).then((result) => {
        if (result.ok) {
          toast({ title: '✓ Impressão de teste enviada', description: 'Cupom impresso via Desktop PDV.' });
        } else {
          toast({ title: 'Erro na impressão', description: result.error || 'Falha.', variant: 'destructive' });
        }
      });
      setShowPreview(true);
      return;
    }

    // Fallback: browser print
    const now = new Date();
    const html = buildReceiptHTML({
      tenantName: 'Meu Estabelecimento',
      orderNumber: 999,
      dateStr: now.toLocaleDateString('pt-BR'),
      timeStr: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      cashierName: 'Teste',
      items: sampleItems.map((item, i) => ({
        index: i + 1,
        name: item.productName,
        variationName: item.variationName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes,
      })),
      subtotal: 82.30,
      total: 82.30,
      paymentMethodLabel: 'PIX',
      isTest: true,
    });
    printReceiptHTML(html, paperWidth);
    setShowPreview(true);
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

      {/* Print Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Printer className="h-4 w-4" /> Modo de Impressão
          </CardTitle>
          <CardDescription>
            Escolha como o cupom será impresso no PDV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={local.print_mode}
            onValueChange={(v: TenantPrintSettings['print_mode']) => update({ print_mode: v })}
            className="space-y-3"
          >
            {/* Web / Browser */}
            <div className="relative">
              <RadioGroupItem value="web" id="mode-web" className="peer sr-only" />
              <Label htmlFor="mode-web" className="flex items-start gap-3 rounded-lg border-2 border-muted bg-card p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                <Monitor className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Navegador (Padrão)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Imprime pelo navegador (pode abrir diálogo de impressão).</p>
                </div>
              </Label>
            </div>

            {/* Desktop PDV */}
            <div className="relative">
              <RadioGroupItem value="desktop" id="mode-desktop" className="peer sr-only" />
              <Label htmlFor="mode-desktop" className="flex items-start gap-3 rounded-lg border-2 border-muted bg-card p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                <Printer className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Desktop (PDV 1 clique)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Impressão 1 clique (requer o app FoodHub PDV Desktop instalado).</p>
                </div>
              </Label>
            </div>

            {/* SmartPOS */}
            <div className="relative">
              <RadioGroupItem value="smartpos" id="mode-smartpos" className="peer sr-only" />
              <Label htmlFor="mode-smartpos" className="flex items-start gap-3 rounded-lg border-2 border-muted bg-card p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                <Smartphone className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">SmartPOS (Maquininha)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Uso em maquininha/SmartPOS (fluxo próprio do dispositivo).</p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Desktop: download + setup block */}
          {local.print_mode === 'desktop' && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary shrink-0" />
                  <h4 className="font-semibold text-sm">FoodHub PDV Desktop (1 clique)</h4>
                </div>

                {hasDesktopBridge ? (
                  <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-xs">
                    <p className="font-medium text-green-700 dark:text-green-300">✅ FoodHub PDV Desktop conectado</p>
                    <p className="text-muted-foreground mt-0.5">Impressão 1 clique está ativa.</p>
                  </div>
                ) : (
                  <>
                    <ol className="text-xs text-muted-foreground space-y-1.5 pl-1">
                      <li className="flex gap-2"><span className="font-bold text-foreground">1.</span> Baixe e instale o app no computador do caixa</li>
                      <li className="flex gap-2"><span className="font-bold text-foreground">2.</span> Abra o app e faça login</li>
                      <li className="flex gap-2"><span className="font-bold text-foreground">3.</span> Volte ao PDV e imprima em 1 clique</li>
                    </ol>

                    <div className="flex flex-col sm:flex-row gap-2">
                      {desktopUrls.windows_url && desktopUrls.windows_url !== '#' ? (
                        <Button
                          className="flex-1"
                          onClick={() => window.open(desktopUrls.windows_url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" /> Baixar FoodHub PDV Desktop
                        </Button>
                      ) : (
                        <Button className="flex-1" disabled>
                          <Download className="h-4 w-4 mr-2" /> Link ainda não configurado pelo administrador
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => window.open('/downloads', '_blank')}>
                        Instruções de instalação
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Recomendado para impressora térmica USB ESC/POS.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* SmartPOS info */}
          {local.print_mode === 'smartpos' && (
            <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs space-y-1">
              <p className="font-medium">📱 SmartPOS ativo</p>
              <p className="text-muted-foreground">
                No modo SmartPOS, a impressão é feita diretamente pela maquininha. Nenhuma impressão será enviada pelo PC.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Printer Routes — visible for web and desktop modes, hidden for smartpos */}
      {local.print_mode !== 'smartpos' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Printer className="h-4 w-4" /> Impressoras por Ambiente
                </CardTitle>
                <CardDescription>
                  {local.print_mode === 'desktop'
                    ? 'Configure uma impressora para cada setor. Clique em "Detectar" para listar as impressoras instaladas.'
                    : 'Gerencie os setores de impressão do seu estabelecimento.'}
                </CardDescription>
              </div>
              {local.print_mode === 'desktop' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={detectPrintersViaBridge}
                  disabled={isDetecting || !hasDesktopBridge}
                >
                  {isDetecting
                    ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    : <Search className="h-4 w-4 mr-1" />}
                  Detectar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Web mode info */}
            {local.print_mode === 'web' && (
              <div className="rounded-md bg-muted/50 border p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">ℹ️ Modo Navegador</p>
                <p>No modo Navegador, a escolha da impressora ocorre no diálogo de impressão do sistema. Você pode gerenciar os setores abaixo, mas a seleção de impressora física só é possível no modo Desktop.</p>
              </div>
            )}

            {/* Desktop mode without bridge warning */}
            {local.print_mode === 'desktop' && !hasDesktopBridge && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-medium">⚠️ FoodHub PDV Desktop não detectado</p>
                <p className="text-muted-foreground">Instale e abra o app Desktop para detectar e selecionar impressoras por setor.</p>
              </div>
            )}

            {/* Detected printers count */}
            {detectedPrinters.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg p-2">
                <Printer className="h-3.5 w-3.5" />
                {detectedPrinters.length} impressora(s) encontrada(s)
                {defaultPrinter && <span className="text-muted-foreground">• Padrão: {defaultPrinter}</span>}
              </div>
            )}

            {/* Dynamic printer routes */}
            {routesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {routes.map((route) => (
                  <div key={route.id} className="flex items-center gap-2 p-3 border rounded-lg bg-card">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={route.label}
                          onChange={(e) => updateRoute(route.id, { label: e.target.value })}
                          className="h-8 text-sm font-medium max-w-[140px]"
                        />
                        <span className="text-xs text-muted-foreground">({route.route_type})</span>
                      </div>
                      {local.print_mode === 'desktop' && detectedPrinters.length > 0 ? (
                        <Select
                          value={route.printer_name || '__default__'}
                          onValueChange={(v) => updateRoute(route.id, { printer_name: v === '__default__' ? null : v })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Usar padrão do sistema" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__default__">
                              {defaultPrinter ? `Padrão do sistema (${defaultPrinter})` : 'Padrão do sistema'}
                            </SelectItem>
                            {detectedPrinters.map(p => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : local.print_mode === 'desktop' ? (
                        <Input
                          value={route.printer_name || ''}
                          onChange={(e) => updateRoute(route.id, { printer_name: e.target.value || null })}
                          placeholder={hasDesktopBridge ? 'Clique Detectar para preencher' : 'Conecte o Desktop PDV para selecionar'}
                          className="h-8 text-sm"
                          disabled={!hasDesktopBridge}
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground pl-1">Impressora: padrão do sistema</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {local.print_mode === 'desktop' && hasDesktopBridge && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleTestPrintForRoute(route.id, route.route_type, route.printer_name)}
                          disabled={testingType !== null}
                        >
                          {testingType === route.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                        </Button>
                      )}
                      {routes.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => removeRoute(route.id)}
                          disabled={routesSaving}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add route */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Input
                value={newRouteLabel}
                onChange={(e) => setNewRouteLabel(e.target.value)}
                placeholder="Nome do setor (ex: Copa, Sobremesas)"
                className="h-8 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                disabled={!newRouteLabel.trim() || routesSaving}
                onClick={() => {
                  addRoute(newRouteLabel.trim());
                  setNewRouteLabel('');
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {local.print_mode === 'desktop'
                ? 'Campos vazios usam a impressora padrão do Windows. Clique no ícone de teste para verificar.'
                : 'Os setores são usados para direcionar os pedidos para os pontos de produção corretos.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* SmartPOS: hidden routes, show info */}
      {local.print_mode === 'smartpos' && (
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground text-center">
              📱 No modo SmartPOS, as rotas de impressão são controladas pela maquininha.
            </p>
          </CardContent>
        </Card>
      )}

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
