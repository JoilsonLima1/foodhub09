import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Check, 
  Clock, 
  AlertCircle,
  Plug2,
  Settings2,
  Megaphone,
  HardDrive,
  Truck,
  ShoppingCart,
  MessageSquare,
  Gift,
  CreditCard,
  RefreshCw,
  Wallet,
  Construction,
  Loader2,
  ExternalLink,
  Building2,
  Plus,
} from 'lucide-react';
import { 
  useAddonModules, 
  ADDON_CATEGORY_LABELS,
  type AddonModule,
  type AddonModuleCategory,
  type ImplementationStatus,
} from '@/hooks/useAddonModules';
import { useTenantModules } from '@/hooks/useTenantModules';
import { useBillingSettings } from '@/hooks/useBillingSettings';
import { useModulePurchases } from '@/hooks/useModulePurchases';
import { useMultiStoreQuota } from '@/hooks/useMultiStoreQuota';
import { cn } from '@/lib/utils';
import { ModulePurchaseDialog } from './ModulePurchaseDialog';
import { ModuleStatusBadge } from '@/components/modules/ModuleStatusBadge';

// Icon mapping for module categories
const CATEGORY_ICONS: Record<AddonModuleCategory, React.ComponentType<{ className?: string }>> = {
  integrations: Plug2,
  operations: Settings2,
  marketing: Megaphone,
  hardware: HardDrive,
  logistics: Truck,
};

// Dynamic icon component based on string name
const getModuleIcon = (iconName: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Package,
    Plug2,
    Settings2,
    Megaphone,
    HardDrive,
    Truck,
    ShoppingCart,
    MessageSquare,
    Building2,
  };
  return icons[iconName] || Package;
};

// Modules that support quota-based purchasing (can buy multiple units)
const QUOTA_BASED_MODULES = ['multi_store'];

export function ModulesSettings() {
  const { modules, isLoading: modulesLoading } = useAddonModules();
  const { tenantModules, tenantInfo, isLoading: tenantLoading, getModulesBreakdown, refetch } = useTenantModules();
  const { settings: billingSettings } = useBillingSettings();
  const { pendingPurchases, hasPendingPurchase, getPendingPurchase, refreshPurchases } = useModulePurchases();
  const multiStoreQuota = useMultiStoreQuota();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<AddonModule | null>(null);

  const isLoading = modulesLoading || tenantLoading;
  const breakdown = getModulesBreakdown();
  const plan = tenantInfo?.subscription_plans as any;

  const isModuleProvisionedFromPlan = (moduleId: string) => {
    return (
      tenantModules?.some(
        (m) =>
          m.addon_module_id === moduleId &&
          m.source === 'plan_included' &&
          ['active', 'trial'].includes(m.status)
      ) || false
    );
  };

  // Group modules by category
  const categories = ['all', ...Object.keys(ADDON_CATEGORY_LABELS)] as const;

  const formatPrice = (price: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handlePurchaseModule = (module: AddonModule) => {
    // Block if there's already a pending purchase
    if (hasPendingPurchase(module.id)) {
      return;
    }
    setSelectedModule(module);
    setPurchaseDialogOpen(true);
  };

  const handlePurchaseSuccess = () => {
    refetch();
    refreshPurchases();
  };

  const handleOpenPaymentUrl = (url: string) => {
    window.open(url, '_blank');
  };

  // Filter available modules by category
  const filteredAvailable = breakdown.availableModules.filter(mod => {
    if (selectedCategory === 'all') return true;
    return mod.category === selectedCategory;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Módulos Adicionais</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
          <CardDescription>
            Expanda as funcionalidades do seu sistema com módulos extras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">Plano Atual</p>
              <p className="text-xl font-bold">{plan?.name || 'Nenhum'}</p>
              <p className="text-sm text-muted-foreground">{formatPrice(breakdown.planPrice)}/mês</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 text-center">
              <p className="text-sm text-muted-foreground">Módulos Ativos</p>
              <p className="text-xl font-bold">
                {breakdown.planIncludedModules.length + breakdown.purchasedModules.length}
              </p>
              <p className="text-sm text-muted-foreground">
                {breakdown.planIncludedModules.length} inclusos + {breakdown.purchasedModules.length} contratados
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
              <p className="text-sm text-green-700 dark:text-green-400">Total Mensal</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                {formatPrice(breakdown.totalMonthly)}
              </p>
              {breakdown.modulesTotal > 0 && (
                <p className="text-xs text-green-600 dark:text-green-500">
                  + {formatPrice(breakdown.modulesTotal)} em módulos
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Included Modules (by plan mapping) */}
      {breakdown.planIncludedModules.length > 0 && (
        <Card className="border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-600" />
              Incluídos no seu Plano ({breakdown.planIncludedModules.length})
            </CardTitle>
            <CardDescription>
              Módulos inclusos gratuitamente no plano {plan?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {breakdown.planIncludedModules.map((module) => {
                const ModuleIcon = getModuleIcon(module.icon || 'Package');
                const isProvisioned = isModuleProvisionedFromPlan(module.id);
                return (
                  <div
                    key={module.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20"
                  >
                    <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <ModuleIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{module.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                          <Gift className="h-3 w-3 mr-1" />
                          Incluso
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {isProvisioned ? 'Ativo' : 'Incluído'}
                        </Badge>
                      </div>
                    </div>
                    {isProvisioned ? (
                      <Check className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchased Modules */}
      {breakdown.purchasedModules.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Módulos Adquiridos ({breakdown.purchasedModules.length})
            </CardTitle>
            <CardDescription>
              Módulos contratados separadamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {breakdown.purchasedModules.map(sub => {
                const ModuleIcon = getModuleIcon(sub.addon_module?.icon || 'Package');
                const isMultiStore = sub.addon_module?.slug === 'multi_store';
                const isPending = hasPendingPurchase(sub.addon_module_id);
                
                return (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 p-4 rounded-lg border bg-primary/5"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ModuleIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{sub.addon_module?.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          {formatPrice(sub.addon_module?.monthly_price || sub.price_paid)}/mês
                        </span>
                        {sub.purchased_at && (
                          <span>Contratado em {formatDate(sub.purchased_at)}</span>
                        )}
                        {/* Show quota info for multi_store */}
                        {isMultiStore && (
                          <span className="flex items-center gap-1 text-primary">
                            <Building2 className="h-3 w-3" />
                            {multiStoreQuota.quota} unidades ({multiStoreQuota.available} disponíveis)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Allow buying more units for quota-based modules */}
                      {isMultiStore && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => {
                            if (sub.addon_module) {
                              setSelectedModule(sub.addon_module);
                              setPurchaseDialogOpen(true);
                            }
                          }}
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Plus className="h-4 w-4 mr-1" />
                          )}
                          +1 unidade
                        </Button>
                      )}
                      <div className="text-right">
                        <Badge variant="default">Ativo</Badge>
                        {sub.next_billing_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Próx: {formatDate(sub.next_billing_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Purchases */}
      {pendingPurchases.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
              Pagamentos Pendentes ({pendingPurchases.length})
            </CardTitle>
            <CardDescription>
              Aguardando confirmação de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPurchases.map(purchase => {
                const ModuleIcon = getModuleIcon(purchase.addon_module?.slug || 'Package');
                return (
                  <div
                    key={purchase.id}
                    className="flex items-center gap-3 p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/30"
                  >
                    <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                      <ModuleIcon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{purchase.addon_module?.name || 'Módulo'}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Aguardando pagamento
                        </span>
                        <span>
                          {formatPrice(purchase.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Pendente
                      </Badge>
                      {purchase.gateway_invoice_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPaymentUrl(purchase.gateway_invoice_url!)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Available Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Disponíveis para Contratação
          </CardTitle>
          <CardDescription>
            Módulos adicionais que você pode contratar para expandir seu sistema
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full h-auto flex flex-nowrap gap-2 overflow-x-auto justify-start md:flex-wrap md:overflow-visible bg-transparent">
          <TabsTrigger 
            value="all" 
            className="shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Todos ({breakdown.availableModules.length})
          </TabsTrigger>
          {Object.entries(ADDON_CATEGORY_LABELS).map(([key, label]) => {
            const Icon = CATEGORY_ICONS[key as AddonModuleCategory];
            const count = breakdown.availableModules.filter(m => m.category === key).length;
            return (
              <TabsTrigger 
                key={key} 
                value={key}
                className="shrink-0 flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4" />
                {label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {filteredAvailable.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">
                  {breakdown.availableModules.length === 0 
                    ? 'Você já possui todos os módulos disponíveis!' 
                    : 'Nenhum módulo disponível nesta categoria.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAvailable.map(module => {
                const ModuleIcon = getModuleIcon(module.icon);
                const implStatus = module.implementation_status || 'coming_soon';
                const isAvailableForPurchase = ['ready', 'beta'].includes(implStatus);
                const isPending = hasPendingPurchase(module.id);
                const pendingPurchase = getPendingPurchase(module.id);
                
                return (
                  <Card 
                    key={module.id}
                    className={cn(
                      "flex flex-col transition-all",
                      isPending && "border-amber-500/50",
                      isAvailableForPurchase && !isPending ? "hover:shadow-md" : "opacity-80"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          isPending ? "bg-amber-100 dark:bg-amber-900/50" : "bg-primary/10"
                        )}>
                          <ModuleIcon className={cn(
                            "h-5 w-5",
                            isPending ? "text-amber-600" : "text-primary"
                          )} />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isPending ? (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Pendente
                            </Badge>
                          ) : (
                            <ModuleStatusBadge status={implStatus} />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {ADDON_CATEGORY_LABELS[module.category]}
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-3">{module.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {module.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-1">
                      {module.features && module.features.length > 0 && (
                        <ul className="space-y-1.5">
                          {(module.features as string[]).slice(0, 4).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {module.requirements && (
                        <div className="mt-3 flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/20">
                          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                          <span className="text-xs text-warning">{module.requirements}</span>
                        </div>
                      )}
                    </CardContent>
                    
                    <CardFooter className="flex-col items-stretch gap-3 pt-4 border-t">
                      <div className="flex items-baseline justify-between">
                        <div>
                          {module.setup_fee > 0 && (
                            <span className="text-xs text-muted-foreground block">
                              Setup: {formatPrice(module.setup_fee)}
                            </span>
                          )}
                          <span className="text-xl font-bold">
                            {formatPrice(module.monthly_price)}
                          </span>
                          <span className="text-sm text-muted-foreground">/mês</span>
                        </div>
                      </div>
                      
                      {isPending ? (
                        <div className="w-full space-y-2">
                          <div className="w-full text-center py-2 px-3 rounded-md bg-amber-100 dark:bg-amber-900/30">
                            <div className="flex items-center justify-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Pagamento em processamento</span>
                            </div>
                          </div>
                          {pendingPurchase?.gateway_invoice_url && (
                            <Button 
                              variant="outline"
                              onClick={() => handleOpenPaymentUrl(pendingPurchase.gateway_invoice_url!)}
                              className="w-full"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ir para Pagamento
                            </Button>
                          )}
                        </div>
                      ) : isAvailableForPurchase ? (
                        <Button 
                          onClick={() => handlePurchaseModule(module)}
                          className="w-full"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Contratar Módulo
                        </Button>
                      ) : (
                        <div className="w-full text-center py-2 px-3 rounded-md bg-muted">
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Construction className="h-4 w-4" />
                            <span>Em desenvolvimento</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Disponível em breve
                          </p>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Purchase Dialog */}
      <ModulePurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        module={selectedModule}
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  );
}
