import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StoneGlobalSettingsPanel } from './StoneGlobalSettingsPanel';
import { StoneAccountsTable } from './StoneAccountsTable';
import { StoneWebhooksPanel } from './StoneWebhooksPanel';
import { StoneAuditPanel } from './StoneAuditPanel';
import { Settings, Server, Webhook, Shield } from 'lucide-react';

export function StoneAdminPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Stone — Painel Super Admin</h2>
        <p className="text-muted-foreground">
          Configurações globais, credenciais, webhooks e auditoria da integração Stone.
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Regras Globais
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Server className="h-4 w-4" /> Contas & Tenants
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" /> Webhooks & Eventos
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <StoneGlobalSettingsPanel />
        </TabsContent>
        <TabsContent value="accounts">
          <StoneAccountsTable />
        </TabsContent>
        <TabsContent value="webhooks">
          <StoneWebhooksPanel />
        </TabsContent>
        <TabsContent value="audit">
          <StoneAuditPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
