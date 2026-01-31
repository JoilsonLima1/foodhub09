import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  useAddonModules,
  AddonModule,
  ADDON_CATEGORY_LABELS,
  ADDON_STATUS_LABELS,
} from '@/hooks/useAddonModules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Loader2,
  Search,
  Package,
  Building2,
  Gift,
  CreditCard,
  RefreshCw,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
  ShoppingCart,
  UserCog,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ActivateModuleDialog } from './ActivateModuleDialog';

interface Tenant {
  id: string;
  name: string;
  subscription_plan_id: string | null;
  subscription_plans?: {
    id: string;
    name: string;
  } | null;
}

interface TenantModuleSubscription {
  id: string;
  tenant_id: string;
  addon_module_id: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  source: 'manual' | 'plan_included' | 'purchase';
  grant_type: string | null;
  is_free: boolean;
  price_paid: number;
  started_at: string;
  expires_at: string | null;
  trial_ends_at: string | null;
  admin_notes: string | null;
  addon_module?: AddonModule;
}

interface ModuleAuditLog {
  id: string;
  action: string;
  source: string | null;
  grant_type: string | null;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  performed_at: string;
  performed_by: string | null;
  addon_module?: {
    name: string;
  };
  performer_profile?: {
    full_name: string;
  } | null;
}

interface PlanAddonModule {
  addon_module_id: string;
  addon_module?: AddonModule;
}

// Hook to fetch all tenants
function useTenants() {
  return useQuery({
    queryKey: ['all-tenants-detailed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id, 
          name, 
          subscription_plan_id,
          subscription_plans:subscription_plan_id(id, name)
        `)
        .order('name');
      
      if (error) throw error;
      return (data || []) as Tenant[];
    },
  });
}

// Hook to get tenant's active modules
function useTenantModules(tenantId: string | null) {
  return useQuery({
    queryKey: ['tenant-modules-admin', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('tenant_addon_subscriptions')
        .select(`
          *,
          addon_module:addon_modules(*)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as TenantModuleSubscription[];
    },
    enabled: !!tenantId,
  });
}

// Hook to get plan's included modules
function usePlanModules(planId: string | null) {
  return useQuery({
    queryKey: ['plan-modules', planId],
    queryFn: async () => {
      if (!planId) return [];
      
      const { data, error } = await supabase
        .from('plan_addon_modules')
        .select(`
          addon_module_id,
          addon_module:addon_modules(*)
        `)
        .eq('plan_id', planId);
      
      if (error) throw error;
      return (data || []) as PlanAddonModule[];
    },
    enabled: !!planId,
  });
}

// Hook to get tenant's module audit history
function useTenantModuleAudit(tenantId: string | null) {
  return useQuery({
    queryKey: ['tenant-module-audit', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('tenant_module_audit')
        .select(`
          *,
          addon_module:addon_modules(name)
        `)
        .eq('tenant_id', tenantId)
        .order('performed_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as ModuleAuditLog[];
    },
    enabled: !!tenantId,
  });
}

type GrantType = 'gift' | 'manual_free' | 'manual_paid';

const GRANT_TYPE_LABELS: Record<GrantType, string> = {
  gift: 'Brinde (Incluído no plano)',
  manual_free: 'Manual (Sem cobrança)',
  manual_paid: 'Manual (Com cobrança externa)',
};

const SOURCE_LABELS: Record<string, string> = {
  plan_included: 'Plano',
  purchase: 'Compra',
  manual: 'Manual',
};

const ACTION_LABELS: Record<string, string> = {
  install: 'Instalação',
  uninstall: 'Desinstalação',
  activate: 'Ativação',
  deactivate: 'Desativação',
  sync: 'Sincronização',
  update: 'Atualização',
};

export function ModulesManagementHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { modules, isLoading: modulesLoading } = useAddonModules();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantSearch, setTenantSearch] = useState('');
  
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [isUninstallDialogOpen, setIsUninstallDialogOpen] = useState(false);
  const [isActivatePaymentOpen, setIsActivatePaymentOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [selectedModuleToInstall, setSelectedModuleToInstall] = useState<string | null>(null);
  const [selectedSubscriptionToUninstall, setSelectedSubscriptionToUninstall] = useState<TenantModuleSubscription | null>(null);
  
  const [grantType, setGrantType] = useState<GrantType>('manual_free');
  const [installNotes, setInstallNotes] = useState('');
  const [uninstallNotes, setUninstallNotes] = useState('');
  
  const selectedTenant = tenants?.find(t => t.id === selectedTenantId);
  
  const { data: tenantModules, isLoading: tenantModulesLoading, refetch: refetchTenantModules } = 
    useTenantModules(selectedTenantId);
  const { data: planModules } = usePlanModules(selectedTenant?.subscription_plan_id);
  const { data: auditLogs, isLoading: auditLoading } = useTenantModuleAudit(selectedTenantId);
  
  // Categorize modules
  const categorizedModules = useMemo(() => {
    if (!tenantModules || !modules) return { plan: [], purchased: [], manual: [], available: [] };
    
    const activeModuleIds = new Set(
      tenantModules
        .filter(m => ['active', 'trial'].includes(m.status))
        .map(m => m.addon_module_id)
    );
    
    const planModuleIds = new Set(planModules?.map(pm => pm.addon_module_id) || []);
    
    const plan = tenantModules.filter(
      m => m.source === 'plan_included' && ['active', 'trial'].includes(m.status)
    );
    
    const purchased = tenantModules.filter(
      m => m.source === 'purchase' && ['active', 'trial'].includes(m.status)
    );
    
    const manual = tenantModules.filter(
      m => m.source === 'manual' && ['active', 'trial'].includes(m.status)
    );
    
    // Available = all active modules not already subscribed
    const available = modules.filter(
      m => m.is_active && !activeModuleIds.has(m.id)
    );
    
    return { plan, purchased, manual, available };
  }, [tenantModules, modules, planModules]);
  
  // Filter tenants by search
  const filteredTenants = tenants?.filter(t => 
    t.name.toLowerCase().includes(tenantSearch.toLowerCase())
  );
  
  // Install module mutation
  const installModule = useMutation({
    mutationFn: async (params: { 
      tenantId: string; 
      moduleId: string; 
      grantType: GrantType;
      notes: string;
    }) => {
      const module = modules?.find(m => m.id === params.moduleId);
      
      const { error } = await supabase
        .from('tenant_addon_subscriptions')
        .insert({
          tenant_id: params.tenantId,
          addon_module_id: params.moduleId,
          status: 'active',
          source: params.grantType === 'gift' ? 'plan_included' : 'manual',
          grant_type: params.grantType,
          is_free: params.grantType !== 'manual_paid',
          price_paid: params.grantType === 'manual_paid' ? (module?.monthly_price || 0) : 0,
          admin_notes: params.notes,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules-admin', selectedTenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-module-audit', selectedTenantId] });
      toast({
        title: 'Módulo instalado',
        description: 'O módulo foi instalado com sucesso para o tenant.',
      });
      resetInstallForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao instalar módulo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Uninstall module mutation
  const uninstallModule = useMutation({
    mutationFn: async (params: { subscriptionId: string; notes: string }) => {
      const { error } = await supabase
        .from('tenant_addon_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          admin_notes: params.notes,
        })
        .eq('id', params.subscriptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules-admin', selectedTenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-module-audit', selectedTenantId] });
      toast({
        title: 'Módulo desinstalado',
        description: 'O módulo foi desinstalado do tenant.',
      });
      setIsUninstallDialogOpen(false);
      setSelectedSubscriptionToUninstall(null);
      setUninstallNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao desinstalar módulo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Force sync mutation
  const forceSync = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.rpc('force_sync_tenant_modules', {
        p_tenant_id: tenantId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules-admin', selectedTenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-module-audit', selectedTenantId] });
      
      const actions = data as Array<{ action_taken: string; module_name: string; details: string }>;
      
      if (actions && actions.length > 0) {
        toast({
          title: 'Sincronização concluída',
          description: `${actions.length} módulo(s) processado(s).`,
        });
      } else {
        toast({
          title: 'Sincronização concluída',
          description: 'Nenhuma alteração necessária.',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const resetInstallForm = () => {
    setIsInstallDialogOpen(false);
    setSelectedModuleToInstall(null);
    setGrantType('manual_free');
    setInstallNotes('');
  };
  
  const handleInstall = () => {
    if (!selectedTenantId || !selectedModuleToInstall || !installNotes.trim()) return;
    
    installModule.mutate({
      tenantId: selectedTenantId,
      moduleId: selectedModuleToInstall,
      grantType,
      notes: installNotes.trim(),
    });
  };
  
  const handleUninstall = () => {
    if (!selectedSubscriptionToUninstall || !uninstallNotes.trim()) return;
    
    uninstallModule.mutate({
      subscriptionId: selectedSubscriptionToUninstall.id,
      notes: uninstallNotes.trim(),
    });
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };
  
  const isLoading = modulesLoading || tenantsLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Tenant Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Selecionar Organização
          </CardTitle>
          <CardDescription>
            Escolha uma organização para gerenciar seus módulos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar organização..."
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {tenantSearch && filteredTenants && filteredTenants.length > 0 && !selectedTenantId && (
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredTenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between"
                      onClick={() => {
                        setSelectedTenantId(tenant.id);
                        setTenantSearch(tenant.name);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{tenant.name}</span>
                      </div>
                      {tenant.subscription_plans && (
                        <Badge variant="outline">
                          {(tenant.subscription_plans as any).name}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            {selectedTenant && (
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedTenant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Plano: {(selectedTenant.subscription_plans as any)?.name || 'Nenhum'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTenantId(null);
                    setTenantSearch('');
                  }}
                >
                  Alterar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Module Management - Only show when tenant is selected */}
      {selectedTenantId && (
        <>
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsInstallDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Instalar Módulo
            </Button>
            <Button 
              variant="outline" 
              onClick={() => forceSync.mutate(selectedTenantId)}
              disabled={forceSync.isPending}
            >
              {forceSync.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reprocessar Módulos
            </Button>
            <Button variant="outline" onClick={() => setIsActivatePaymentOpen(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Ativar Pagamento Confirmado
            </Button>
            <Button variant="outline" onClick={() => setIsHistoryOpen(true)}>
              <History className="h-4 w-4 mr-2" />
              Histórico
            </Button>
          </div>
          
          {/* Modules Overview */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Plan Included Modules */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="h-4 w-4 text-green-600" />
                  Módulos do Plano (Brinde)
                </CardTitle>
                <CardDescription>
                  {categorizedModules.plan.length} módulo(s) incluído(s) no plano
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categorizedModules.plan.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum módulo incluído no plano
                  </p>
                ) : (
                  <div className="space-y-2">
                    {categorizedModules.plan.map((sub) => (
                      <div 
                        key={sub.id}
                        className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">
                            {sub.addon_module?.name}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-green-700">
                          Grátis
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Purchased Modules */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  Módulos Comprados
                </CardTitle>
                <CardDescription>
                  {categorizedModules.purchased.length} módulo(s) via checkout/pagamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categorizedModules.purchased.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum módulo comprado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {categorizedModules.purchased.map((sub) => (
                      <div 
                        key={sub.id}
                        className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">
                            {sub.addon_module?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {formatPrice(sub.price_paid)}/mês
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setSelectedSubscriptionToUninstall(sub);
                              setIsUninstallDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Manual Modules */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-purple-600" />
                  Instalados Manualmente
                </CardTitle>
                <CardDescription>
                  {categorizedModules.manual.length} módulo(s) forçado(s) pelo admin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categorizedModules.manual.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum módulo instalado manualmente
                  </p>
                ) : (
                  <div className="space-y-2">
                    {categorizedModules.manual.map((sub) => (
                      <div 
                        key={sub.id}
                        className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950/20 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-purple-600" />
                          <div>
                            <span className="font-medium text-sm">
                              {sub.addon_module?.name}
                            </span>
                            {sub.admin_notes && (
                              <p className="text-xs text-muted-foreground truncate max-w-40">
                                {sub.admin_notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {sub.is_free ? 'Grátis' : formatPrice(sub.price_paid)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setSelectedSubscriptionToUninstall(sub);
                              setIsUninstallDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Available Modules */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-600" />
                  Disponíveis para Instalar
                </CardTitle>
                <CardDescription>
                  {categorizedModules.available.length} módulo(s) disponível(eis)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categorizedModules.available.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Todos os módulos já estão ativos
                  </p>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {categorizedModules.available.map((module) => (
                        <div 
                          key={module.id}
                          className="flex items-center justify-between p-2 border rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium text-sm">
                                {module.name}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {ADDON_CATEGORY_LABELS[module.category]}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {formatPrice(module.monthly_price)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedModuleToInstall(module.id);
                                setIsInstallDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* All Active Subscriptions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Todos os Módulos Ativos</CardTitle>
              <CardDescription>
                Visão completa de todos os módulos associados a este tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantModulesLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : tenantModules?.filter(m => ['active', 'trial'].includes(m.status)).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum módulo ativo
                      </TableCell>
                    </TableRow>
                  ) : (
                    tenantModules
                      ?.filter(m => ['active', 'trial'].includes(m.status))
                      .map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{sub.addon_module?.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {sub.addon_module?.category && ADDON_CATEGORY_LABELS[sub.addon_module.category]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                sub.source === 'plan_included' ? 'default' :
                                sub.source === 'purchase' ? 'secondary' : 'outline'
                              }
                            >
                              {SOURCE_LABELS[sub.source] || sub.source}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                              {ADDON_STATUS_LABELS[sub.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sub.is_free || sub.source === 'plan_included' ? (
                              <span className="text-green-600 font-medium">Grátis</span>
                            ) : (
                              <span>{formatPrice(sub.price_paid)}/mês</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(sub.started_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {sub.source !== 'plan_included' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedSubscriptionToUninstall(sub);
                                  setIsUninstallDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      
      {/* Install Module Dialog */}
      <Dialog open={isInstallDialogOpen} onOpenChange={(open) => { if (!open) resetInstallForm(); else setIsInstallDialogOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Instalar Módulo Manualmente</DialogTitle>
            <DialogDescription>
              Selecione o tipo de concessão e adicione uma observação obrigatória.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Module Selector */}
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Select value={selectedModuleToInstall || ''} onValueChange={setSelectedModuleToInstall}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um módulo" />
                </SelectTrigger>
                <SelectContent>
                  {categorizedModules.available.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>{module.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatPrice(module.monthly_price)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Grant Type */}
            <div className="space-y-2">
              <Label>Tipo de Concessão</Label>
              <RadioGroup value={grantType} onValueChange={(v) => setGrantType(v as GrantType)}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-2 border rounded-md">
                    <RadioGroupItem value="gift" id="gift" />
                    <Label htmlFor="gift" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium">Brinde (Incluído)</p>
                          <p className="text-xs text-muted-foreground">
                            Simula inclusão no plano
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 border rounded-md">
                    <RadioGroupItem value="manual_free" id="manual_free" />
                    <Label htmlFor="manual_free" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="font-medium">Manual (Sem cobrança)</p>
                          <p className="text-xs text-muted-foreground">
                            Liberado gratuitamente pelo admin
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 border rounded-md">
                    <RadioGroupItem value="manual_paid" id="manual_paid" />
                    <Label htmlFor="manual_paid" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="font-medium">Manual (Com cobrança externa)</p>
                          <p className="text-xs text-muted-foreground">
                            Pagamento confirmado fora do sistema
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label>Observação / Motivo *</Label>
              <Textarea
                value={installNotes}
                onChange={(e) => setInstallNotes(e.target.value)}
                placeholder="Ex: Liberado para teste por 30 dias conforme solicitação do cliente..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Campo obrigatório para rastreabilidade
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={resetInstallForm}>
              Cancelar
            </Button>
            <Button 
              onClick={handleInstall}
              disabled={!selectedModuleToInstall || !installNotes.trim() || installModule.isPending}
            >
              {installModule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Instalar Módulo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Uninstall Confirmation Dialog */}
      <AlertDialog open={isUninstallDialogOpen} onOpenChange={setIsUninstallDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Desinstalar Módulo
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desinstalar o módulo{' '}
              <strong>{selectedSubscriptionToUninstall?.addon_module?.name}</strong>?
              Esta ação irá remover o acesso do tenant a este módulo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label>Motivo da desinstalação *</Label>
            <Textarea
              value={uninstallNotes}
              onChange={(e) => setUninstallNotes(e.target.value)}
              placeholder="Ex: Cancelamento a pedido do cliente..."
              rows={2}
              className="mt-2"
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedSubscriptionToUninstall(null);
              setUninstallNotes('');
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUninstall}
              disabled={!uninstallNotes.trim() || uninstallModule.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {uninstallModule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Desinstalar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações
            </DialogTitle>
            <DialogDescription>
              Últimas 50 alterações em módulos deste tenant
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-96">
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : auditLogs?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum registro encontrado
              </p>
            ) : (
              <div className="space-y-3 pr-4">
                {auditLogs?.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          log.action === 'install' ? 'default' :
                          log.action === 'uninstall' ? 'destructive' :
                          log.action === 'sync' ? 'secondary' : 'outline'
                        }>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                        <span className="font-medium">{log.addon_module?.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.performed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    
                    {(log.previous_status || log.new_status) && (
                      <div className="text-sm text-muted-foreground">
                        {log.previous_status && (
                          <span>De: <Badge variant="outline" className="ml-1">{log.previous_status}</Badge></span>
                        )}
                        {log.new_status && (
                          <span className="ml-2">Para: <Badge variant="outline" className="ml-1">{log.new_status}</Badge></span>
                        )}
                      </div>
                    )}
                    
                    {log.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        "{log.notes}"
                      </p>
                    )}
                    
                    {log.source && (
                      <div className="text-xs text-muted-foreground">
                        Fonte: {SOURCE_LABELS[log.source] || log.source}
                        {log.grant_type && ` • Tipo: ${GRANT_TYPE_LABELS[log.grant_type as GrantType] || log.grant_type}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Activate Payment Dialog */}
      <ActivateModuleDialog
        open={isActivatePaymentOpen}
        onOpenChange={setIsActivatePaymentOpen}
      />
    </div>
  );
}
