/**
 * PartnerPoliciesManager - Super Admin control for partner limits
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Shield, Settings, Package } from 'lucide-react';
import { useAddonModules } from '@/hooks/useAddonModules';

interface PartnerPolicy {
  id: string;
  partner_id: string | null;
  max_plans_per_partner: number;
  allow_free_plan: boolean;
  min_paid_plan_price: number;
  free_plan_max_modules: number;
  free_plan_max_features: number;
  max_trial_days_allowed: number;
  trial_allowed_modules: string[];
  trial_allowed_features: string[];
  allowed_modules_catalog: string[];
  allowed_features_catalog: string[];
  max_modules_per_plan: number;
  max_features_per_plan: number;
  require_plan_hierarchy: boolean;
  allow_offline_billing: boolean;
  // Fee limits
  max_platform_fee_percent: number;
  max_platform_fee_fixed: number;
  max_pix_fee_percent: number;
  max_credit_fee_percent: number;
  max_debit_fee_percent: number;
  max_boleto_fee_fixed: number;
}

// Available features catalog
const AVAILABLE_FEATURES = [
  { key: 'kyc_selfie', label: 'Exigir Selfie (KYC)' },
  { key: 'kyc_document', label: 'Exigir Documento (KYC)' },
  { key: 'subcomanda', label: 'Subcomandas' },
  { key: 'split_payment', label: 'Divisão de Pagamento' },
  { key: 'table_reservation', label: 'Reserva de Mesas' },
  { key: 'customer_app', label: 'App do Cliente' },
  { key: 'waiter_app', label: 'App do Garçom' },
  { key: 'kitchen_display', label: 'Display da Cozinha' },
  { key: 'multi_store', label: 'Multi-Loja' },
  { key: 'api_access', label: 'Acesso à API' },
  { key: 'custom_domain', label: 'Domínio Personalizado' },
  { key: 'white_label', label: 'White Label' },
  { key: 'priority_support', label: 'Suporte Prioritário' },
  { key: 'advanced_reports', label: 'Relatórios Avançados' },
];

export function PartnerPoliciesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { modules } = useAddonModules();
  
  const [editingPolicy, setEditingPolicy] = useState<PartnerPolicy | null>(null);

  // Fetch global policy
  const { data: globalPolicy, isLoading } = useQuery({
    queryKey: ['partner-policies-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_policies')
        .select('*')
        .is('partner_id', null)
        .single();

      if (error) throw error;
      return data as PartnerPolicy;
    },
  });

  // Fetch partner-specific policies
  const { data: partnerPolicies = [] } = useQuery({
    queryKey: ['partner-policies-specific'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_policies')
        .select(`
          *,
          partner:partners(id, name)
        `)
        .not('partner_id', 'is', null);

      if (error) throw error;
      return data as (PartnerPolicy & { partner: { id: string; name: string } })[];
    },
  });

  const updatePolicy = useMutation({
    mutationFn: async (policy: Partial<PartnerPolicy> & { id: string }) => {
      const { error } = await supabase
        .from('partner_policies')
        .update(policy)
        .eq('id', policy.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-policies-global'] });
      queryClient.invalidateQueries({ queryKey: ['partner-policies-specific'] });
      toast({ title: 'Política atualizada!' });
      setEditingPolicy(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (!editingPolicy) return;
    updatePolicy.mutate(editingPolicy);
  };

  const toggleModule = (moduleKey: string, field: 'allowed_modules_catalog' | 'trial_allowed_modules') => {
    if (!editingPolicy) return;
    const current = editingPolicy[field] || [];
    const updated = current.includes(moduleKey)
      ? current.filter(k => k !== moduleKey)
      : [...current, moduleKey];
    setEditingPolicy({ ...editingPolicy, [field]: updated });
  };

  const toggleFeature = (featureKey: string, field: 'allowed_features_catalog' | 'trial_allowed_features') => {
    if (!editingPolicy) return;
    const current = editingPolicy[field] || [];
    const updated = current.includes(featureKey)
      ? current.filter(k => k !== featureKey)
      : [...current, featureKey];
    setEditingPolicy({ ...editingPolicy, [field]: updated });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activePolicy = editingPolicy || globalPolicy;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Políticas de Parceiros
          </h2>
          <p className="text-muted-foreground">
            Defina limites globais e regras para os parceiros White-label
          </p>
        </div>
        
        {editingPolicy ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingPolicy(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updatePolicy.isPending}>
              {updatePolicy.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditingPolicy(globalPolicy!)}>
            <Settings className="h-4 w-4 mr-2" />
            Editar Política Global
          </Button>
        )}
      </div>

      {activePolicy && (
        <Tabs defaultValue="limits" className="space-y-4">
          <TabsList>
            <TabsTrigger value="limits">Limites</TabsTrigger>
            <TabsTrigger value="modules">Módulos</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="trial">Trial</TabsTrigger>
            <TabsTrigger value="fees">Taxas</TabsTrigger>
            <TabsTrigger value="billing">Cobrança</TabsTrigger>
          </TabsList>

          <TabsContent value="limits">
            <Card>
              <CardHeader>
                <CardTitle>Limites de Planos</CardTitle>
                <CardDescription>Defina os limites para criação de planos pelos parceiros</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Máximo de planos por parceiro</Label>
                    <Input
                      type="number"
                      value={activePolicy.max_plans_per_partner}
                      onChange={(e) => editingPolicy && setEditingPolicy({
                        ...editingPolicy,
                        max_plans_per_partner: parseInt(e.target.value) || 1
                      })}
                      disabled={!editingPolicy}
                      min={1}
                      max={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preço mínimo plano pago (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={activePolicy.min_paid_plan_price}
                      onChange={(e) => editingPolicy && setEditingPolicy({
                        ...editingPolicy,
                        min_paid_plan_price: parseFloat(e.target.value) || 0
                      })}
                      disabled={!editingPolicy}
                      min={0}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Máx módulos por plano</Label>
                    <Input
                      type="number"
                      value={activePolicy.max_modules_per_plan}
                      onChange={(e) => editingPolicy && setEditingPolicy({
                        ...editingPolicy,
                        max_modules_per_plan: parseInt(e.target.value) || 1
                      })}
                      disabled={!editingPolicy}
                      min={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Máx features por plano</Label>
                    <Input
                      type="number"
                      value={activePolicy.max_features_per_plan}
                      onChange={(e) => editingPolicy && setEditingPolicy({
                        ...editingPolicy,
                        max_features_per_plan: parseInt(e.target.value) || 1
                      })}
                      disabled={!editingPolicy}
                      min={1}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Permitir Plano Gratuito</p>
                    <p className="text-sm text-muted-foreground">
                      Parceiros podem criar planos com preço R$ 0,00
                    </p>
                  </div>
                  <Switch
                    checked={activePolicy.allow_free_plan}
                    onCheckedChange={(checked) => editingPolicy && setEditingPolicy({
                      ...editingPolicy,
                      allow_free_plan: checked
                    })}
                    disabled={!editingPolicy}
                  />
                </div>

                {activePolicy.allow_free_plan && (
                  <div className="grid gap-4 md:grid-cols-2 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-2">
                      <Label>Máx módulos no plano grátis</Label>
                      <Input
                        type="number"
                        value={activePolicy.free_plan_max_modules}
                        onChange={(e) => editingPolicy && setEditingPolicy({
                          ...editingPolicy,
                          free_plan_max_modules: parseInt(e.target.value) || 0
                        })}
                        disabled={!editingPolicy}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Máx features no plano grátis</Label>
                      <Input
                        type="number"
                        value={activePolicy.free_plan_max_features}
                        onChange={(e) => editingPolicy && setEditingPolicy({
                          ...editingPolicy,
                          free_plan_max_features: parseInt(e.target.value) || 0
                        })}
                        disabled={!editingPolicy}
                        min={0}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Exigir Hierarquia de Planos</p>
                    <p className="text-sm text-muted-foreground">
                      Planos superiores devem incluir tudo do inferior + extras
                    </p>
                  </div>
                  <Switch
                    checked={activePolicy.require_plan_hierarchy}
                    onCheckedChange={(checked) => editingPolicy && setEditingPolicy({
                      ...editingPolicy,
                      require_plan_hierarchy: checked
                    })}
                    disabled={!editingPolicy}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Catálogo de Módulos Permitidos
                </CardTitle>
                <CardDescription>
                  Selecione quais módulos os parceiros podem incluir nos planos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {modules.map((module) => (
                    <div
                      key={module.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        activePolicy.allowed_modules_catalog?.includes(module.slug)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => editingPolicy && toggleModule(module.slug, 'allowed_modules_catalog')}
                    >
                      <span className="text-sm">{module.name}</span>
                      {activePolicy.allowed_modules_catalog?.includes(module.slug) && (
                        <Badge variant="default" className="ml-2">Ativo</Badge>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {activePolicy.allowed_modules_catalog?.length || 0} módulos selecionados
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Catálogo de Features Permitidas</CardTitle>
                <CardDescription>
                  Selecione quais funcionalidades os parceiros podem incluir nos planos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {AVAILABLE_FEATURES.map((feature) => (
                    <div
                      key={feature.key}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        activePolicy.allowed_features_catalog?.includes(feature.key)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => editingPolicy && toggleFeature(feature.key, 'allowed_features_catalog')}
                    >
                      <span className="text-sm">{feature.label}</span>
                      {activePolicy.allowed_features_catalog?.includes(feature.key) && (
                        <Badge variant="default" className="ml-2">Ativo</Badge>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {activePolicy.allowed_features_catalog?.length || 0} features selecionadas
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trial">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Trial</CardTitle>
                <CardDescription>
                  Defina os limites do período de teste para novos tenants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Máximo de dias de trial permitido</Label>
                  <Input
                    type="number"
                    value={activePolicy.max_trial_days_allowed}
                    onChange={(e) => editingPolicy && setEditingPolicy({
                      ...editingPolicy,
                      max_trial_days_allowed: parseInt(e.target.value) || 1
                    })}
                    disabled={!editingPolicy}
                    min={1}
                    max={90}
                  />
                  <p className="text-sm text-muted-foreground">
                    Parceiros podem definir trial de 1 até {activePolicy.max_trial_days_allowed} dias
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Módulos disponíveis durante trial</Label>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {modules
                      .filter(m => activePolicy.allowed_modules_catalog?.includes(m.slug))
                      .map((module) => (
                        <div
                          key={module.id}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                            activePolicy.trial_allowed_modules?.includes(module.slug)
                              ? 'border-green-500 bg-green-500/5'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => editingPolicy && toggleModule(module.slug, 'trial_allowed_modules')}
                        >
                          <span className="text-sm">{module.name}</span>
                          {activePolicy.trial_allowed_modules?.includes(module.slug) && (
                            <Badge variant="outline" className="ml-2 border-green-500 text-green-600">Trial</Badge>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Features disponíveis durante trial</Label>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {AVAILABLE_FEATURES
                      .filter(f => activePolicy.allowed_features_catalog?.includes(f.key))
                      .map((feature) => (
                        <div
                          key={feature.key}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                            activePolicy.trial_allowed_features?.includes(feature.key)
                              ? 'border-green-500 bg-green-500/5'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => editingPolicy && toggleFeature(feature.key, 'trial_allowed_features')}
                        >
                          <span className="text-sm">{feature.label}</span>
                          {activePolicy.trial_allowed_features?.includes(feature.key) && (
                            <Badge variant="outline" className="ml-2 border-green-500 text-green-600">Trial</Badge>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Opções de Cobrança</CardTitle>
                <CardDescription>
                  Configure as opções de cobrança disponíveis para parceiros
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Permitir Cobrança Offline/Manual</p>
                    <p className="text-sm text-muted-foreground">
                      Parceiros podem gerenciar cobranças fora da plataforma
                    </p>
                  </div>
                  <Switch
                    checked={activePolicy.allow_offline_billing}
                    onCheckedChange={(checked) => editingPolicy && setEditingPolicy({
                      ...editingPolicy,
                      allow_offline_billing: checked
                    })}
                    disabled={!editingPolicy}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle>Limites de Taxas de Transação</CardTitle>
                <CardDescription>
                  Defina os valores máximos de taxas que parceiros podem cobrar de seus tenants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Taxa Percentual Máxima (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={activePolicy.max_platform_fee_percent ?? 10}
                      onChange={(e) => editingPolicy && setEditingPolicy({
                        ...editingPolicy,
                        max_platform_fee_percent: parseFloat(e.target.value) || 0
                      })}
                      disabled={!editingPolicy}
                      min={0}
                      max={50}
                    />
                    <p className="text-xs text-muted-foreground">
                      Taxa base máxima sobre transações
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Taxa Fixa Máxima (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={activePolicy.max_platform_fee_fixed ?? 5}
                      onChange={(e) => editingPolicy && setEditingPolicy({
                        ...editingPolicy,
                        max_platform_fee_fixed: parseFloat(e.target.value) || 0
                      })}
                      disabled={!editingPolicy}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor fixo máximo por transação
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>PIX - Taxa Máxima (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={activePolicy.max_pix_fee_percent ?? 5}
                      onChange={(e) => editingPolicy && setEditingPolicy({
                        ...editingPolicy,
                        max_pix_fee_percent: parseFloat(e.target.value) || 0
                      })}
                      disabled={!editingPolicy}
                      min={0}
                      max={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Débito - Taxa Máxima (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={activePolicy.max_debit_fee_percent ?? 5}
                      onChange={(e) => editingPolicy && setEditingPolicy({
                        ...editingPolicy,
                        max_debit_fee_percent: parseFloat(e.target.value) || 0
                      })}
                      disabled={!editingPolicy}
                      min={0}
                      max={20}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Crédito - Taxa Máxima (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={activePolicy.max_credit_fee_percent ?? 10}
                      onChange={(e) => editingPolicy && setEditingPolicy({
                        ...editingPolicy,
                        max_credit_fee_percent: parseFloat(e.target.value) || 0
                      })}
                      disabled={!editingPolicy}
                      min={0}
                      max={30}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Boleto - Taxa Fixa Máxima (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={activePolicy.max_boleto_fee_fixed ?? 10}
                      onChange={(e) => editingPolicy && setEditingPolicy({
                        ...editingPolicy,
                        max_boleto_fee_fixed: parseFloat(e.target.value) || 0
                      })}
                      disabled={!editingPolicy}
                      min={0}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Partner-specific overrides */}
      {partnerPolicies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Políticas por Parceiro</CardTitle>
            <CardDescription>
              Exceções configuradas para parceiros específicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {partnerPolicies.map((policy) => (
                <div key={policy.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{policy.partner?.name}</span>
                  <Button variant="outline" size="sm" onClick={() => setEditingPolicy(policy)}>
                    Editar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
