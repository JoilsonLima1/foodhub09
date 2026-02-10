/**
 * PartnerPolicyOverridesPanel - Per-partner policy override editor
 * Used inside Super Admin > Partners > [partner] > Permissões tab
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, RotateCcw, Info } from 'lucide-react';

interface OverrideData {
  allow_free_plan: boolean | null;
  allow_partner_gateway: boolean | null;
  billing_owner: string | null;
  allow_offline_billing: boolean | null;
  max_plans: number | null;
  min_paid_price: number | null;
  max_modules_per_plan: number | null;
  max_features_per_plan: number | null;
  max_trial_days: number | null;
  tx_fee_max_percent: number | null;
  tx_fee_max_fixed_cents: number | null;
  notes: string | null;
}

const EMPTY_OVERRIDE: OverrideData = {
  allow_free_plan: null,
  allow_partner_gateway: null,
  billing_owner: null,
  allow_offline_billing: null,
  max_plans: null,
  min_paid_price: null,
  max_modules_per_plan: null,
  max_features_per_plan: null,
  max_trial_days: null,
  tx_fee_max_percent: null,
  tx_fee_max_fixed_cents: null,
  notes: null,
};

export function PartnerPolicyOverridesPanel({ partnerId }: { partnerId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<OverrideData>(EMPTY_OVERRIDE);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch effective policy (merged)
  const { data: effectivePolicy } = useQuery({
    queryKey: ['effective-policy', partnerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_effective_partner_policy', { p_partner_id: partnerId });
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing override
  const { data: existingOverride, isLoading } = useQuery({
    queryKey: ['partner-override', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_policy_overrides')
        .select('*')
        .eq('partner_id', partnerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingOverride) {
      setFormData({
        allow_free_plan: existingOverride.allow_free_plan,
        allow_partner_gateway: existingOverride.allow_partner_gateway,
        billing_owner: existingOverride.billing_owner,
        allow_offline_billing: existingOverride.allow_offline_billing,
        max_plans: existingOverride.max_plans,
        min_paid_price: existingOverride.min_paid_price ? Number(existingOverride.min_paid_price) : null,
        max_modules_per_plan: existingOverride.max_modules_per_plan,
        max_features_per_plan: existingOverride.max_features_per_plan,
        max_trial_days: existingOverride.max_trial_days,
        tx_fee_max_percent: existingOverride.tx_fee_max_percent ? Number(existingOverride.tx_fee_max_percent) : null,
        tx_fee_max_fixed_cents: existingOverride.tx_fee_max_fixed_cents,
        notes: existingOverride.notes,
      });
    }
  }, [existingOverride]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Upsert
      const { error } = await supabase
        .from('partner_policy_overrides')
        .upsert({
          partner_id: partnerId,
          ...formData,
        }, { onConflict: 'partner_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-override', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['effective-policy', partnerId] });
      toast({ title: 'Permissões salvas!' });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('partner_policy_overrides')
        .delete()
        .eq('partner_id', partnerId);
      if (error) throw error;
    },
    onSuccess: () => {
      setFormData(EMPTY_OVERRIDE);
      queryClient.invalidateQueries({ queryKey: ['partner-override', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['effective-policy', partnerId] });
      toast({ title: 'Overrides removidos. Usando política global.' });
      setHasChanges(false);
    },
  });

  const updateField = <K extends keyof OverrideData>(key: K, value: OverrideData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const hasOverride = !!existingOverride;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Permissões Individuais</h3>
          <p className="text-sm text-muted-foreground">
            Valores em branco usam a política global. Preencha para sobrescrever.
          </p>
        </div>
        <div className="flex gap-2">
          {hasOverride && (
            <Button variant="outline" size="sm" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar para Global
            </Button>
          )}
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !hasChanges}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      {hasOverride && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Este parceiro possui overrides ativos. Campos preenchidos sobrescrevem a política global.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Boolean toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TriStateToggle
              label="Permitir Plano Gratuito"
              description={`Global: ${effectivePolicy?.allow_free_plan ? 'Sim' : 'Não'}`}
              value={formData.allow_free_plan}
              onChange={(v) => updateField('allow_free_plan', v)}
            />
            <TriStateToggle
              label="Permitir Gateway Próprio"
              description={`Global: ${effectivePolicy?.allow_partner_gateway ? 'Sim' : 'Não'}`}
              value={formData.allow_partner_gateway}
              onChange={(v) => updateField('allow_partner_gateway', v)}
            />
            <TriStateToggle
              label="Permitir Faturamento Offline"
              description={`Global: ${effectivePolicy?.allow_offline_billing ? 'Sim' : 'Não'}`}
              value={formData.allow_offline_billing}
              onChange={(v) => updateField('allow_offline_billing', v)}
            />
          </CardContent>
        </Card>

        {/* Numeric overrides */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Limites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <OverrideInput
              label="Máx. Planos"
              value={formData.max_plans}
              globalValue={effectivePolicy?.max_plans}
              onChange={(v) => updateField('max_plans', v)}
              type="number"
            />
            <OverrideInput
              label="Preço Mín. Pago (R$)"
              value={formData.min_paid_price}
              globalValue={effectivePolicy?.min_paid_price}
              onChange={(v) => updateField('min_paid_price', v)}
              type="number"
              step="0.01"
            />
            <OverrideInput
              label="Máx. Módulos/Plano"
              value={formData.max_modules_per_plan}
              globalValue={effectivePolicy?.max_modules_per_plan}
              onChange={(v) => updateField('max_modules_per_plan', v)}
              type="number"
            />
            <OverrideInput
              label="Máx. Features/Plano"
              value={formData.max_features_per_plan}
              globalValue={effectivePolicy?.max_features_per_plan}
              onChange={(v) => updateField('max_features_per_plan', v)}
              type="number"
            />
            <OverrideInput
              label="Máx. Dias Trial"
              value={formData.max_trial_days}
              globalValue={effectivePolicy?.max_trial_days}
              onChange={(v) => updateField('max_trial_days', v)}
              type="number"
            />
          </CardContent>
        </Card>

        {/* Fee limits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taxas Máximas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <OverrideInput
              label="Taxa % Máx. Transação"
              value={formData.tx_fee_max_percent}
              globalValue={effectivePolicy?.tx_fee_max_percent}
              onChange={(v) => updateField('tx_fee_max_percent', v)}
              type="number"
              step="0.01"
            />
            <OverrideInput
              label="Taxa Fixa Máx. (centavos)"
              value={formData.tx_fee_max_fixed_cents}
              globalValue={effectivePolicy?.tx_fee_max_fixed_cents}
              onChange={(v) => updateField('tx_fee_max_fixed_cents', v)}
              type="number"
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm"
              placeholder="Notas internas sobre este parceiro..."
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value || null)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Tri-state toggle: null (inherit), true, false
function TriStateToggle({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const cycleValue = () => {
    if (value === null) onChange(true);
    else if (value === true) onChange(false);
    else onChange(null);
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {value === null ? (
          <Badge variant="outline" className="cursor-pointer" onClick={cycleValue}>Herdar</Badge>
        ) : value ? (
          <Badge variant="default" className="cursor-pointer" onClick={cycleValue}>Sim</Badge>
        ) : (
          <Badge variant="destructive" className="cursor-pointer" onClick={cycleValue}>Não</Badge>
        )}
      </div>
    </div>
  );
}

// Nullable number input with global fallback display
function OverrideInput({ label, value, globalValue, onChange, type = 'number', step }: {
  label: string;
  value: number | null;
  globalValue?: number;
  onChange: (v: number | null) => void;
  type?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        {globalValue !== undefined && (
          <span className="text-xs text-muted-foreground">Global: {globalValue}</span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type={type}
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder="Herdar global"
          className="flex-1"
        />
        {value !== null && (
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onChange(null)}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
