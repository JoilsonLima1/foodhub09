import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Printer, TestTube, CheckCircle, HelpCircle, Zap, Wifi, WifiOff, Loader2, ExternalLink, Monitor, RefreshCw, Search, Plus, Trash2 } from 'lucide-react';
import { usePrinterRoutes } from '@/hooks/usePrinterRoutes';
import { useToast } from '@/hooks/use-toast';
import { ReceiptPrint } from '@/components/pos/ReceiptPrint';
import { PrinterHelpModal } from './PrinterHelpModal';
import { KioskHelpModal } from './KioskHelpModal';
import { PrintAgentPairing } from './PrintAgentPairing';
import { DefaultPrinterCallout } from './DefaultPrinterCallout';
import { useTenantPrintSettings, type TenantPrintSettings } from '@/hooks/useTenantPrintSettings';
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
  const { routes, isLoading: routesLoading, isSaving: routesSaving, addRoute, updateRoute, removeRoute } = usePrinterRoutes();
  const [local, setLocal] = useState<TenantPrintSettings | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showKioskHelp, setShowKioskHelp] = useState(false);
  const [testingAgent, setTestingAgent] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Printer detection state
  const [detectedPrinters, setDetectedPrinters] = useState<string[]>([]);
  const [defaultPrinter, setDefaultPrinter] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
  const [testingType, setTestingType] = useState<string | null>(null);

  const getAgentEndpoint = useCallback(() => {
    return local?.agent_endpoint || settings?.agent_endpoint || 'http://127.0.0.1:8123';
  }, [local, settings]);

  const checkAgentHealth = useCallback(async (): Promise<boolean> => {
    const endpoint = getAgentEndpoint();
    try {
      const resp = await fetch(`${endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      const data = await resp.json();
      return !!data.ok;
    } catch {
      return false;
    }
  }, [getAgentEndpoint]);

  const detectPrinters = useCallback(async (showToast = true) => {
    const endpoint = getAgentEndpoint();
    setIsDetecting(true);
    try {
      // First check health
      const healthy = await checkAgentHealth();
      if (!healthy) {
        setAgentOnline(false);
        setDetectedPrinters([]);
        if (showToast) {
          toast({
            title: 'Agent offline',
            description: 'O FoodHub Print Agent não está respondendo. Verifique se está instalado e rodando no computador.',
            variant: 'destructive',
          });
        }
        return;
      }

      const resp = await fetch(`${endpoint}/impressoras`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      const data = await resp.json();
      if (data.ok) {
        const printers = data.impressoras || data.printers || [];
        const defPrinter = data.impressoraPadrao || data.defaultPrinter || null;
        setDetectedPrinters(printers);
        setDefaultPrinter(defPrinter);
        setAgentOnline(true);

        // Auto-fill Caixa with default if not set
        if (defPrinter && local && !local.default_printer_name) {
          setLocal(prev => prev ? { ...prev, default_printer_name: defPrinter } : prev);
        }

        if (showToast) {
          toast({
            title: `${printers.length} impressora(s) detectada(s)`,
            description: defPrinter ? `Padrão: ${defPrinter}` : 'Nenhuma impressora padrão identificada.',
          });
        }
      } else {
        throw new Error(data.error || 'Erro ao detectar');
      }
    } catch (err) {
      if (agentOnline !== false) setAgentOnline(false);
      setDetectedPrinters([]);
      if (showToast) {
        toast({
          title: 'Agent offline',
          description: 'Não foi possível conectar ao FoodHub Print Agent. Verifique se está rodando.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsDetecting(false);
    }
  }, [getAgentEndpoint, checkAgentHealth, local, toast, agentOnline]);

  // Auto-detect when Agent mode is active
  useEffect(() => {
    if (local?.print_mode === 'AGENT' && agentOnline === null) {
      detectPrinters(false);
    }
  }, [local?.print_mode, agentOnline, detectPrinters]);

  const handleTestPrintForRoute = async (routeId: string, routeType: string, printerName: string | null) => {
    if (!local) return;
    const endpoint = getAgentEndpoint();
    setTestingType(routeId);
    try {
      const resp = await fetch(`${endpoint}/test-print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeDaImpressora: printerName || undefined,
          tipo: routeType,
          larguraDoPapel: parseInt(local.paper_width),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await resp.json();
      if (data.ok) {
        toast({ title: `✓ Teste ${routeType} enviado`, description: `Impressora: ${data.printer || 'padrão'}` });
      } else if (data.code === 'PRINTER_NOT_FOUND') {
        toast({
          title: 'Impressora não encontrada',
          description: 'Clique em "Detectar" e selecione uma impressora da lista.',
          variant: 'destructive',
        });
      } else {
        throw new Error(data.error || 'Erro');
      }
    } catch (err) {
      toast({
        title: `Falha no teste ${routeType}`,
        description: (err as Error).message || 'Agent não respondeu.',
        variant: 'destructive',
      });
    } finally {
      setTestingType(null);
    }
  };

  const [newRouteLabel, setNewRouteLabel] = useState('');

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
      default_printer_name: local.default_printer_name,
      kitchen_printer_name: local.kitchen_printer_name,
      bar_printer_name: local.bar_printer_name,
    });
  };

  const handleTestPrint = async () => {
    handleSave();
    const paperWidth = local.paper_width as PaperWidthMM;

    // If Agent mode, try agent-side test print first
    if (local.print_mode === 'AGENT' && local.agent_endpoint) {
      try {
        const resp = await fetch(`${local.agent_endpoint}/print/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paperWidth: parseInt(local.paper_width),
            printerName: local.default_printer_name || undefined,
          }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await resp.json();
        if (data.ok) {
          toast({
            title: '✓ Impressão enviada para a impressora padrão',
            description: 'Cupom de teste impresso via Agent sem diálogo.',
          });
          setShowPreview(true);
          return;
        }
        throw new Error(data.error || 'Agent retornou erro');
      } catch (err) {
        console.warn('[TestPrint] Agent failed, falling back to browser:', err);
        toast({
          title: 'Agent offline — usando impressão do navegador',
          description: 'Vai aparecer a janela de imprimir. Instale o Agent para 1-clique.',
          variant: 'destructive',
        });
      }
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

  const handleTestAgent = async () => {
    if (!local.agent_endpoint) {
      toast({ title: 'Endpoint não configurado', variant: 'destructive' });
      return;
    }
    setTestingAgent(true);
    try {
      const healthy = await checkAgentHealth();
      setAgentOnline(healthy);
      if (healthy) {
        // Also detect printers
        await detectPrinters(false);
      }
      toast({
        title: healthy ? '✓ Agent conectado!' : 'Agent não encontrado',
        description: healthy
          ? 'O FoodHub Print Agent está respondendo. Impressoras detectadas.'
          : `Não foi possível conectar em ${local.agent_endpoint}. Verifique se o Agent está instalado e rodando.`,
        variant: healthy ? 'default' : 'destructive',
      });
    } catch {
      setAgentOnline(false);
      toast({
        title: 'Agent não encontrado',
        description: `Não foi possível conectar em ${local.agent_endpoint}`,
        variant: 'destructive',
      });
    } finally {
      setTestingAgent(false);
    }
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
            {/* Browser */}
            <div className="relative">
              <RadioGroupItem value="BROWSER" id="mode-browser" className="peer sr-only" />
              <Label htmlFor="mode-browser" className="flex items-start gap-3 rounded-lg border-2 border-muted bg-card p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                <Monitor className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Navegador (Padrão)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Abre a janela de seleção de impressora do sistema. Funciona em qualquer navegador.</p>
                </div>
              </Label>
            </div>

            {/* Kiosk */}
            <div className="relative">
              <RadioGroupItem value="KIOSK" id="mode-kiosk" className="peer sr-only" />
              <Label htmlFor="mode-kiosk" className="flex items-start gap-3 rounded-lg border-2 border-muted bg-card p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                <Zap className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Kiosk (Sem diálogo – igual iFood)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Imprime direto na impressora padrão sem abrir janela. Requer Chrome com flags especiais.</p>
                </div>
              </Label>
            </div>

            {/* Agent */}
            <div className="relative">
              <RadioGroupItem value="AGENT" id="mode-agent" className="peer sr-only" />
              <Label htmlFor="mode-agent" className="flex items-start gap-3 rounded-lg border-2 border-muted bg-card p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                <ExternalLink className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Agent (FoodHub Print)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Envia comandos para o agente local instalado no computador. Requer software adicional.</p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Kiosk info */}
          {local.print_mode === 'KIOSK' && (
            <div className="space-y-3 pt-2 border-t">
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs text-foreground space-y-1">
                <p className="font-medium">🖨️ Kiosk ativo — impressão silenciosa</p>
                <p className="text-muted-foreground">O código de impressão é o mesmo do modo Browser. A diferença é que o Chrome iniciado com <code className="bg-muted px-1 rounded">--kiosk-printing</code> envia direto para a impressora padrão.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowKioskHelp(true)}>
                <HelpCircle className="h-4 w-4 mr-1" /> Como configurar o Chrome Kiosk
              </Button>
            </div>
          )}

          {/* Agent config */}
          {local.print_mode === 'AGENT' && (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-2">
                <Label>Endpoint do Agente</Label>
                <div className="flex gap-2">
                  <Input
                    value={local.agent_endpoint || 'http://127.0.0.1:8123'}
                    onChange={(e) => update({ agent_endpoint: e.target.value })}
                    placeholder="http://127.0.0.1:8123"
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

      {/* Printer Names (for Agent mode) */}
      {local.print_mode === 'AGENT' && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Printer className="h-4 w-4" /> Rotas de Impressão
                  </CardTitle>
                  <CardDescription>
                    Configure uma impressora para cada setor. Clique em "Detectar" para listar as impressoras instaladas.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => detectPrinters(true)}
                  disabled={isDetecting}
                >
                  {isDetecting
                    ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    : <Search className="h-4 w-4 mr-1" />}
                  Detectar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {agentOnline === false && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <WifiOff className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Agent offline</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Inicie o FoodHub Print Agent ou{' '}
                      <a href="/downloads" target="_blank" className="text-primary hover:underline">baixe aqui</a>.
                    </p>
                  </div>
                </div>
              )}

              {agentOnline && detectedPrinters.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg p-2">
                  <Wifi className="h-3.5 w-3.5" />
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
                        {detectedPrinters.length > 0 ? (
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
                        ) : (
                          <Input
                            value={route.printer_name || ''}
                            onChange={(e) => updateRoute(route.id, { printer_name: e.target.value || null })}
                            placeholder="Detecte para preencher"
                            className="h-8 text-sm"
                          />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleTestPrintForRoute(route.id, route.route_type, route.printer_name)}
                          disabled={testingType !== null || !agentOnline}
                        >
                          {testingType === route.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                        </Button>
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
                Campos vazios usam a impressora padrão do Windows. Clique no ícone de teste para verificar.
              </p>
            </CardContent>
          </Card>

          <PrintAgentPairing />
        </>
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
      <KioskHelpModal open={showKioskHelp} onOpenChange={setShowKioskHelp} />
    </div>
  );
}
