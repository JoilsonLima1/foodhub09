import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Landmark, CreditCard, Banknote, Settings } from 'lucide-react';

const GATEWAYS = [
  { provider: 'stripe', label: 'Stripe', description: 'Cartão de crédito/débito internacional', icon: CreditCard, route: '/settings/payments/gateways/stripe' },
  { provider: 'asaas', label: 'Asaas', description: 'Pix, Boleto e Cartão nacional', icon: Banknote, route: '/settings/payments/gateways/asaas' },
  { provider: 'stone', label: 'Stone Online', description: 'Cartão, PIX e boleto via Stone', icon: Landmark, route: '/stone' },
];

export function TenantOnlineGateways() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();

  const { data: accounts } = useQuery({
    queryKey: ['tenant-provider-accounts', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_provider_accounts')
        .select('provider, status, last_tested_at')
        .eq('scope_type', 'tenant')
        .eq('scope_id', tenantId!);
      if (error) throw error;
      return data || [];
    },
  });

  const getAccountStatus = (provider: string) => {
    const acc = accounts?.find((a) => a.provider === provider);
    if (!acc) return null;
    return acc.status;
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {GATEWAYS.map((gw) => {
        const status = getAccountStatus(gw.provider);
        const Icon = gw.icon;
        return (
          <Card key={gw.provider} className="flex flex-col justify-between">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <span className="font-semibold">{gw.label}</span>
                {status === 'active' && <Badge variant="default" className="ml-auto text-xs">Ativo</Badge>}
                {status && status !== 'active' && <Badge variant="secondary" className="ml-auto text-xs">{status}</Badge>}
                {!status && <Badge variant="outline" className="ml-auto text-xs">Não configurado</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{gw.description}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate(gw.route)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
