import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Split, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SplitSettings {
  id: string;
  default_commission_percent: number;
  default_commission_fixed: number;
  auto_split_enabled: boolean;
  manual_fallback_enabled: boolean;
  platform_woovi_account_id: string | null;
  auto_create_subaccounts: boolean;
}

export function PixSplitSettingsTab() {
  const [settings, setSettings] = useState<SplitSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('pix_split_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error loading split settings:', error);
      toast.error('Erro ao carregar configurações de split');
    } else {
      setSettings(data as any);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);

    const { error } = await supabase
      .from('pix_split_settings')
      .update({
        default_commission_percent: settings.default_commission_percent,
        default_commission_fixed: settings.default_commission_fixed,
        auto_split_enabled: settings.auto_split_enabled,
        manual_fallback_enabled: settings.manual_fallback_enabled,
        platform_woovi_account_id: settings.platform_woovi_account_id,
        auto_create_subaccounts: settings.auto_create_subaccounts,
      })
      .eq('id', settings.id);

    if (error) {
      toast.error('Erro ao salvar configurações');
      console.error(error);
    } else {
      toast.success('Configurações de split salvas!');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return <p className="text-sm text-muted-foreground">Configurações não encontradas.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Split className="h-5 w-5 text-primary" />
            Configurações de Split Automático
          </CardTitle>
          <CardDescription>
            Configure o modelo marketplace com split automático via Woovi/OpenPix.
            A comissão da plataforma é aplicada em cada cobrança PIX.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggles */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-sm">Split Automático</p>
                <p className="text-xs text-muted-foreground">Dividir pagamentos automaticamente via Woovi</p>
              </div>
              <Switch
                checked={settings.auto_split_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, auto_split_enabled: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-sm">Fallback Manual</p>
                <p className="text-xs text-muted-foreground">Registrar comissão manual se split falhar</p>
              </div>
              <Switch
                checked={settings.manual_fallback_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, manual_fallback_enabled: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-sm">Criar Subcontas Automaticamente</p>
                <p className="text-xs text-muted-foreground">Criar subconta Woovi ao ativar tenant</p>
              </div>
              <Switch
                checked={settings.auto_create_subaccounts}
                onCheckedChange={(v) => setSettings({ ...settings, auto_create_subaccounts: v })}
              />
            </div>
          </div>

          {/* Commission fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Comissão Padrão (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={settings.default_commission_percent}
                onChange={(e) => setSettings({ ...settings, default_commission_percent: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Percentual cobrado sobre cada PIX</p>
            </div>

            <div className="space-y-2">
              <Label>Comissão Fixa (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={settings.default_commission_fixed}
                onChange={(e) => setSettings({ ...settings, default_commission_fixed: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Valor fixo adicional por transação</p>
            </div>
          </div>

          {/* Platform Account ID */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              ID da Conta Plataforma (Woovi)
            </Label>
            <Input
              placeholder="Ex: pixKey ou accountId da plataforma"
              value={settings.platform_woovi_account_id || ''}
              onChange={(e) => setSettings({ ...settings, platform_woovi_account_id: e.target.value || null })}
            />
            <p className="text-xs text-muted-foreground">
              Identificador da conta da plataforma no Woovi para receber a parte do split
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Demonstrative Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Exemplo de Cálculo (Demonstrativo)</CardTitle>
          <CardDescription className="text-xs">
            Simulação com base nos percentuais configurados acima. Não altera o backend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const exampleAmount = 100;
            const pct = settings.default_commission_percent || 0;
            const fixed = settings.default_commission_fixed || 0;
            const commission = (exampleAmount * pct / 100) + fixed;
            const merchant = exampleAmount - commission;
            return (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Valor da Cobrança</p>
                  <p className="text-lg font-bold">R$ {exampleAmount.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">Comissão Plataforma</p>
                  <p className="text-lg font-bold text-primary">R$ {commission.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">{pct}% + R$ {fixed.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Valor Lojista</p>
                  <p className="text-lg font-bold">R$ {merchant.toFixed(2)}</p>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Tax Model Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Modelo Tributário Recomendado
          </CardTitle>
          <CardDescription className="text-xs">
            Informativo — não altera configurações do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">CNAE sugerido:</p>
            <p>• 6311-9/00 — Tratamento de dados, provedores de serviços de aplicação e hospedagem</p>
            <p>• 6319-4/00 — Portais, provedores de conteúdo e outros serviços de informação</p>
            <p>• 7490-1/04 — Atividades de intermediação e agenciamento de serviços</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Classificação da receita:</p>
            <p>✅ Prestação de serviço de intermediação digital</p>
            <p>✅ Comissão de marketplace</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">NÃO classificar como:</p>
            <p>❌ Receita financeira</p>
            <p>❌ Spread bancário</p>
            <p>❌ Intermediação de pagamento</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
