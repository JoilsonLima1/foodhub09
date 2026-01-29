import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Gift, CreditCard, Calendar, DollarSign, Check } from 'lucide-react';
import type { ModulesBreakdown } from '@/hooks/useTenantModules';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionCompositionCardProps {
  breakdown: ModulesBreakdown;
  billingMode: 'bundle' | 'separate';
  currentPeriodEnd: string | null | undefined;
}

export function SubscriptionCompositionCard({ 
  breakdown, 
  billingMode,
  currentPeriodEnd 
}: SubscriptionCompositionCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const hasModules = breakdown.includedModules.length > 0 || breakdown.purchasedModules.length > 0;

  if (!hasModules && breakdown.planPrice === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Composição da Assinatura
        </CardTitle>
        <CardDescription>
          Detalhamento completo do seu plano e módulos contratados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Breakdown Table */}
        <div className="rounded-lg border overflow-hidden">
          {/* Header */}
          <div className="bg-muted/50 px-4 py-2 border-b">
            <div className="grid grid-cols-3 text-sm font-medium text-muted-foreground">
              <span>Item</span>
              <span className="text-center">Tipo</span>
              <span className="text-right">Valor/mês</span>
            </div>
          </div>
          
          {/* Plan Row */}
          <div className="px-4 py-3 border-b bg-green-50/50 dark:bg-green-950/20">
            <div className="grid grid-cols-3 items-center">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-green-600" />
                <span className="font-medium">Plano Base</span>
              </div>
              <div className="text-center">
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  Assinatura
                </Badge>
              </div>
              <span className="text-right font-semibold">
                {formatPrice(breakdown.planPrice)}
              </span>
            </div>
          </div>

          {/* Included Modules */}
          {breakdown.includedModules.map(mod => (
            <div key={mod.id} className="px-4 py-3 border-b">
              <div className="grid grid-cols-3 items-center">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-blue-600" />
                  <span>{mod.addon_module?.name}</span>
                </div>
                <div className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    Incluso no Plano
                  </Badge>
                </div>
                <span className="text-right text-green-600 font-medium">
                  Grátis
                </span>
              </div>
            </div>
          ))}

          {/* Purchased Modules */}
          {breakdown.purchasedModules.map(mod => (
            <div key={mod.id} className="px-4 py-3 border-b">
              <div className="grid grid-cols-3 items-center">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>{mod.addon_module?.name}</span>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="text-xs">
                    Add-on Contratado
                  </Badge>
                </div>
                <span className="text-right font-medium">
                  {formatPrice(mod.addon_module?.monthly_price || mod.price_paid)}
                </span>
              </div>
            </div>
          ))}

          {/* Total Row */}
          <div className="px-4 py-4 bg-primary/5">
            <div className="grid grid-cols-3 items-center">
              <span className="font-bold text-lg">Total Mensal</span>
              <div className="text-center">
                {billingMode === 'bundle' ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Cobrança Única
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    Cobranças Separadas
                  </Badge>
                )}
              </div>
              <span className="text-right font-bold text-xl text-primary">
                {formatPrice(breakdown.totalMonthly)}
              </span>
            </div>
          </div>
        </div>

        {/* Next Payments Section */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Próximos Pagamentos
          </h4>
          
          {billingMode === 'bundle' ? (
            <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Próximo pagamento (plano + módulos)</p>
                <p className="font-medium">{formatDate(currentPeriodEnd)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="font-bold text-lg">{formatPrice(breakdown.totalMonthly)}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Plan payment */}
              <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Plano</p>
                    <p className="text-xs text-muted-foreground">{formatDate(currentPeriodEnd)}</p>
                  </div>
                </div>
                <span className="font-medium">{formatPrice(breakdown.planPrice)}</span>
              </div>

              {/* Each purchased module */}
              {breakdown.purchasedModules.map(mod => (
                <div key={mod.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{mod.addon_module?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {mod.next_billing_date ? formatDate(mod.next_billing_date) : formatDate(currentPeriodEnd)}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">
                    {formatPrice(mod.addon_module?.monthly_price || mod.price_paid)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Billing Mode Info */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
          <Check className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-400">
              {billingMode === 'bundle' ? 'Fatura Única' : 'Cobranças Separadas'}
            </p>
            <p className="text-blue-600 dark:text-blue-300">
              {billingMode === 'bundle' 
                ? 'Todos os itens são cobrados em uma única fatura mensal com detalhamento completo.'
                : 'O plano e cada módulo são cobrados separadamente, podendo ter datas de vencimento diferentes.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
