import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2 } from 'lucide-react';
import { useStoneGlobalSettings } from '@/hooks/useStoneProviderAccounts';
import { useState, useEffect } from 'react';

const INTEGRATION_TYPES = [
  { value: 'stone_online', label: 'Stone Online (Pagamento Online)' },
  { value: 'stone_connect', label: 'Stone Connect / Connect 2.0 (POS)' },
  { value: 'stone_tef', label: 'Stone TEF (PDV/Desktop)' },
  { value: 'stone_openbank', label: 'Stone OpenBank / Banking' },
];

export function StoneGlobalSettingsPanel() {
  const { settings, isLoading, updateSettings } = useStoneGlobalSettings();
  const [form, setForm] = useState({
    allow_tenant_credentials: true,
    allow_partner_credentials: true,
    force_master_credentials: false,
    enabled_integration_types: ['stone_online', 'stone_connect', 'stone_tef', 'stone_openbank'],
    platform_fee_enabled: false,
    platform_fee_percent: 0,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        allow_tenant_credentials: settings.allow_tenant_credentials,
        allow_partner_credentials: settings.allow_partner_credentials,
        force_master_credentials: settings.force_master_credentials,
        enabled_integration_types: settings.enabled_integration_types,
        platform_fee_enabled: settings.platform_fee_enabled,
        platform_fee_percent: settings.platform_fee_percent,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(form);
  };

  const toggleIntegrationType = (type: string) => {
    setForm(prev => ({
      ...prev,
      enabled_integration_types: prev.enabled_integration_types.includes(type)
        ? prev.enabled_integration_types.filter(t => t !== type)
        : [...prev.enabled_integration_types, type],
    }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Controle de Credenciais</CardTitle>
          <CardDescription>Defina como as credenciais Stone podem ser utilizadas no ecossistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Permitir credenciais por Tenant</Label>
              <p className="text-xs text-muted-foreground">Cada lojista pode configurar suas próprias credenciais Stone.</p>
            </div>
            <Switch checked={form.allow_tenant_credentials} onCheckedChange={v => setForm(f => ({ ...f, allow_tenant_credentials: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Permitir credenciais por Parceiro</Label>
              <p className="text-xs text-muted-foreground">Parceiros podem ter credenciais próprias para seus tenants.</p>
            </div>
            <Switch checked={form.allow_partner_credentials} onCheckedChange={v => setForm(f => ({ ...f, allow_partner_credentials: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Forçar credencial master (plataforma)</Label>
              <p className="text-xs text-muted-foreground">Todos os pagamentos usam a credencial da plataforma.</p>
            </div>
            <Switch checked={form.force_master_credentials} onCheckedChange={v => setForm(f => ({ ...f, force_master_credentials: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Integração Disponíveis</CardTitle>
          <CardDescription>Selecione quais tipos de integração Stone ficam habilitados para tenants e parceiros.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {INTEGRATION_TYPES.map(type => (
            <div key={type.value} className="flex items-center gap-3">
              <Checkbox
                checked={form.enabled_integration_types.includes(type.value)}
                onCheckedChange={() => toggleIntegrationType(type.value)}
              />
              <div>
                <span className="text-sm font-medium">{type.label}</span>
                {!form.enabled_integration_types.includes(type.value) && (
                  <Badge variant="outline" className="ml-2 text-xs">Desabilitado</Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Taxa da Plataforma</CardTitle>
          <CardDescription>Configure taxas sobre transações processadas via Stone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Habilitar taxa da plataforma</Label>
            <Switch checked={form.platform_fee_enabled} onCheckedChange={v => setForm(f => ({ ...f, platform_fee_enabled: v }))} />
          </div>
          {form.platform_fee_enabled && (
            <div className="flex items-center gap-2">
              <Label>Percentual (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.platform_fee_percent}
                onChange={e => setForm(f => ({ ...f, platform_fee_percent: parseFloat(e.target.value) || 0 }))}
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateSettings.isPending}>
        {updateSettings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar Configurações
      </Button>
    </div>
  );
}
