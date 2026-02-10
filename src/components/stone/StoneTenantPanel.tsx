import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StoneOnboardingWizard } from './StoneOnboardingWizard';
import { StoneStatusPanel } from './StoneStatusPanel';
import { StoneTransactionsPanel } from './StoneTransactionsPanel';
import { Settings, Activity, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function StoneTenantPanel() {
  const { tenantId } = useAuth();
  const [tab, setTab] = useState('setup');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Stone — Integração de Pagamentos</h2>
        <p className="text-muted-foreground">Configure e gerencie sua integração Stone.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Configuração
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> Status & Logs
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Transações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <StoneOnboardingWizard tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="status">
          <StoneStatusPanel tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="transactions">
          <StoneTransactionsPanel tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
