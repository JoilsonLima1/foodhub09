import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { GatewaySetupGuide, GatewayAutoSetupButton, GatewayCredentialsForm } from '@/components/gateway';

export default function TenantGatewayConfigPage() {
  const { provider } = useParams<{ provider: string }>();
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const validProvider = provider === 'stripe' || provider === 'asaas' || provider === 'stone'
    ? provider as 'stripe' | 'asaas' | 'stone'
    : null;

  if (!validProvider) {
    return (
      <div className="p-6">
        <p>Provedor não encontrado.</p>
        <Button variant="ghost" onClick={() => navigate('/settings?tab=payments')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings?tab=payments')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Pagamentos
        </Button>
        {tenantId && (
          <GatewayAutoSetupButton
            provider={validProvider}
            scopeType="tenant"
            scopeId={tenantId}
            onComplete={() => queryClient.invalidateQueries({ queryKey: ['provider-account'] })}
          />
        )}
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="guide" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Guia Completo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <GatewayCredentialsForm
            provider={validProvider}
            scopeType="tenant"
            scopeId={tenantId || undefined}
          />
        </TabsContent>

        <TabsContent value="guide">
          <GatewaySetupGuide provider={validProvider} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
