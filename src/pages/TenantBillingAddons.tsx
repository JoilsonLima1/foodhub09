/**
 * TenantBillingAddonsPage - View and subscribe to partner add-ons
 * Phase 12: Add-ons, Proration, Coupons, Entitlements
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, CheckCircle2, Loader2, Info } from 'lucide-react';
import { useTenantAddons } from '@/hooks/useTenantAddons';

export default function TenantBillingAddonsPage() {
  const { 
    availableAddons, 
    subscriptions, 
    isLoading, 
    subscribe, 
    cancel,
    isSubscribing 
  } = useTenantAddons();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const subscribedIds = new Set(subscriptions.map(s => s.addon_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Add-ons Disponíveis
        </h1>
        <p className="text-muted-foreground">Contrate recursos adicionais para sua loja</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Add-ons recorrentes serão cobrados no próximo ciclo de faturamento.
        </AlertDescription>
      </Alert>

      {availableAddons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum add-on disponível no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableAddons.map((addon) => {
            const isSubscribed = subscribedIds.has(addon.id);
            return (
              <Card key={addon.id} className={isSubscribed ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{addon.name}</CardTitle>
                    {isSubscribed && (
                      <Badge variant="default" className="shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{addon.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                      R$ {addon.amount.toFixed(2)}
                    </span>
                    {addon.pricing_type === 'recurring' && addon.billing_period && (
                      <span className="text-muted-foreground">
                        /{addon.billing_period === 'monthly' ? 'mês' : 'ano'}
                      </span>
                    )}
                    {addon.pricing_type === 'one_time' && (
                      <Badge variant="secondary" className="ml-2">Único</Badge>
                    )}
                  </div>

                  {isSubscribed ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const sub = subscriptions.find(s => s.addon_id === addon.id);
                        if (sub) cancel({ subscriptionId: sub.id });
                      }}
                      disabled={isSubscribing}
                    >
                      Cancelar Assinatura
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => subscribe(addon.id)}
                      disabled={isSubscribing}
                    >
                      {isSubscribing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Contratar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Current Subscriptions Section */}
      {subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Minhas Assinaturas de Add-ons</CardTitle>
            <CardDescription>Add-ons ativos na sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{sub.addon_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Ativo desde {new Date(sub.start_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                    {sub.status === 'active' ? 'Ativo' : sub.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
