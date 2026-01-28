import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Calendar, CreditCard, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SubscriptionSettings() {
  const { session } = useAuth();
  const { subscriptionStatus, isLoading, getDaysRemaining } = useTrialStatus();
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const handleUpgrade = async () => {
    if (!session?.access_token) return;

    setIsUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId: 'starter' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar checkout',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session?.access_token) return;

    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao abrir portal',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const getStatusBadge = () => {
    if (!subscriptionStatus) return null;

    switch (subscriptionStatus.status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Período de Teste</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Pagamento Pendente</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      default:
        return <Badge variant="secondary">Sem Assinatura</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const isTrialing = subscriptionStatus?.isTrialing;
  const isActive = subscriptionStatus?.status === 'active';
  const isExpired = subscriptionStatus?.status === 'expired' || subscriptionStatus?.status === 'none';
  const daysRemaining = getDaysRemaining();

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Status da Assinatura
          </CardTitle>
          <CardDescription>
            Gerencie sua assinatura e plano atual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status Atual</p>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                {isTrialing && daysRemaining > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({daysRemaining} dias restantes)
                  </span>
                )}
              </div>
            </div>
            {subscriptionStatus?.planId && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Plano</p>
                <p className="font-medium">
                  {subscriptionStatus.planId.includes('starter') ? 'Starter' : 
                   subscriptionStatus.planId.includes('professional') ? 'Professional' : 
                   subscriptionStatus.planId.includes('enterprise') ? 'Enterprise' : 'Básico'}
                </p>
              </div>
            )}
          </div>

          {/* Trial Warning */}
          {isTrialing && daysRemaining <= 3 && (
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-500">
                  Seu período de teste está acabando!
                </p>
                <p className="text-sm text-muted-foreground">
                  {daysRemaining === 0 
                    ? 'Seu período de teste expira hoje.' 
                    : `Restam apenas ${daysRemaining} dias de teste.`}
                  {' '}Faça upgrade para continuar usando todas as funcionalidades.
                </p>
              </div>
            </div>
          )}

          {/* Dates */}
          {(subscriptionStatus?.trialEndDate || subscriptionStatus?.currentPeriodEnd) && (
            <div className="grid gap-4 md:grid-cols-2">
              {isTrialing && subscriptionStatus.trialEndDate && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fim do Período de Teste</p>
                    <p className="font-medium">{formatDate(subscriptionStatus.trialEndDate)}</p>
                  </div>
                </div>
              )}
              {isActive && subscriptionStatus.currentPeriodEnd && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Próxima Renovação</p>
                    <p className="font-medium">{formatDate(subscriptionStatus.currentPeriodEnd)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {(isTrialing || isExpired) && (
              <Button onClick={handleUpgrade} disabled={isUpgrading}>
                {isUpgrading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Fazer Upgrade
                  </>
                )}
              </Button>
            )}
            
            {(isActive || isTrialing) && subscriptionStatus?.isSubscribed && (
              <Button variant="outline" onClick={handleManageSubscription} disabled={isOpeningPortal}>
                {isOpeningPortal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Abrindo...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Gerenciar Assinatura
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plans Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Planos Disponíveis</CardTitle>
          <CardDescription>
            Compare os planos e escolha o melhor para seu negócio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Starter */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Starter</h3>
                {subscriptionStatus?.planId?.includes('starter') && (
                  <Badge variant="secondary">Atual</Badge>
                )}
              </div>
              <p className="text-2xl font-bold">R$ 99<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Até 3 usuários</li>
                <li>• 100 produtos</li>
                <li>• PDV e Pedidos</li>
                <li>• Relatórios básicos</li>
              </ul>
            </div>

            {/* Professional */}
            <div className="p-4 border-2 border-primary rounded-lg space-y-3 relative">
              <Badge className="absolute -top-2 right-4">Mais Popular</Badge>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Professional</h3>
                {subscriptionStatus?.planId?.includes('professional') && (
                  <Badge variant="secondary">Atual</Badge>
                )}
              </div>
              <p className="text-2xl font-bold">R$ 199<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Até 10 usuários</li>
                <li>• Produtos ilimitados</li>
                <li>• Controle de estoque</li>
                <li>• Previsões de IA</li>
              </ul>
            </div>

            {/* Enterprise */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Enterprise</h3>
                {subscriptionStatus?.planId?.includes('enterprise') && (
                  <Badge variant="secondary">Atual</Badge>
                )}
              </div>
              <p className="text-2xl font-bold">R$ 399<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Usuários ilimitados</li>
                <li>• Multi-lojas</li>
                <li>• API customizada</li>
                <li>• Suporte prioritário</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
