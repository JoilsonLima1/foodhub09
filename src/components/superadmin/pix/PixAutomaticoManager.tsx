import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Zap, Server, Tag, GitBranch, Calculator, KeyRound, Split } from 'lucide-react';
import { usePixAutomatico } from '@/hooks/usePixAutomatico';
import { PixPspProvidersTab } from './PixPspProvidersTab';
import { PixPricingPlansTab } from './PixPricingPlansTab';
import { PixAvailabilityRulesTab } from './PixAvailabilityRulesTab';
import { PixSimulatorTab } from './PixSimulatorTab';
import { WooviCredentialsPanel } from './WooviCredentialsPanel';
import { PixSplitSettingsTab } from './PixSplitSettingsTab';

export function PixAutomaticoManager() {
  const {
    providers,
    pricingPlans,
    rules,
    isLoading,
    toggleProvider,
    updateProvider,
    createPlan,
    updatePlan,
    createRule,
    updateRule,
    deleteRule,
  } = usePixAutomatico();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          PIX Automático (sem CPF)
        </h2>
        <p className="text-muted-foreground text-sm">
          Sistema multi-PSP com TXID, webhook e cobrança automática via fatura
        </p>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            PSPs
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Planos de Preço
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Simulador
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Credenciais
          </TabsTrigger>
          <TabsTrigger value="split" className="flex items-center gap-2">
            <Split className="h-4 w-4" />
            Split / Comissões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers">
          <PixPspProvidersTab
            providers={providers}
            onToggle={(id, active) => toggleProvider.mutate({ id, is_active: active })}
            onUpdate={(updates) => updateProvider.mutate(updates)}
          />
        </TabsContent>

        <TabsContent value="plans">
          <PixPricingPlansTab
            plans={pricingPlans}
            onCreate={(plan) => createPlan.mutate(plan)}
            onUpdate={(updates) => updatePlan.mutate(updates)}
          />
        </TabsContent>

        <TabsContent value="rules">
          <PixAvailabilityRulesTab
            rules={rules}
            providers={providers}
            plans={pricingPlans}
            onCreate={(rule) => createRule.mutate(rule)}
            onUpdate={(updates) => updateRule.mutate(updates)}
            onDelete={(id) => deleteRule.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="simulator">
          <PixSimulatorTab plans={pricingPlans} />
        </TabsContent>

        <TabsContent value="credentials">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Credenciais de plataforma (escopo global) utilizadas como fallback para tenants sem credencial própria.
            </p>
            {providers.filter(p => p.name === 'woovi' || p.name === 'openpix').map(p => (
              <WooviCredentialsPanel key={p.id} scope="platform" pspProviderId={p.id} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="split">
          <PixSplitSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
