import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ArrowLeft, 
  Building2,
  Plus,
  BarChart3,
  MapPin,
  Users,
  ShoppingBag,
  Trash2,
  Loader2,
  Phone,
  Star,
  AlertCircle,
  Shield,
  Package,
  ShoppingCart,
  Info,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';
import { useMultiStore, Store } from '@/hooks/useMultiStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface MultiStorePanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function MultiStorePanel({ module, onBack }: MultiStorePanelProps) {
  const navigate = useNavigate();
  const {
    stores,
    stats,
    isLoading,
    canManageStores,
    createStore,
    deleteStore,
    toggleStore,
    canCreateBranch,
    hasModulePurchased,
  } = useMultiStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [togglingStoreId, setTogglingStoreId] = useState<string | null>(null);
  const [newStore, setNewStore] = useState({
    name: '',
    code: '',
    type: 'branch' as 'headquarters' | 'branch' | 'franchise',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    manager_name: '',
  });

  const handleCreateStore = () => {
    if (!newStore.name.trim() || !newStore.code.trim()) {
      toast.error('Preencha o nome e o código da loja');
      return;
    }
    createStore.mutate(newStore, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setNewStore({
          name: '',
          code: '',
          type: 'branch',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          phone: '',
          email: '',
          manager_name: '',
        });
      },
    });
  };

  const handleToggleStore = async (store: Store, newStatus: boolean) => {
    if (store.is_headquarters && !newStatus) {
      toast.error('A loja matriz não pode ser desativada.');
      return;
    }

    if (!canManageStores) {
      toast.error('Você não tem permissão para alterar o status da loja.');
      return;
    }

    setTogglingStoreId(store.id);
    
    try {
      await toggleStore.mutateAsync({ id: store.id, is_active: newStatus });
    } finally {
      setTogglingStoreId(null);
    }
  };

  const isToggleDisabled = (store: Store) => {
    if (store.is_headquarters) return true;
    if (togglingStoreId === store.id) return true;
    if (!canManageStores) return true;
    return false;
  };

  const getToggleTooltip = (store: Store) => {
    if (store.is_headquarters) return 'A loja matriz não pode ser desativada';
    if (!canManageStores) return 'Você não tem permissão para alterar o status';
    return store.is_active ? 'Clique para desativar' : 'Clique para ativar';
  };

  const getStoreTypeLabel = (type: string, isHeadquarters: boolean) => {
    if (isHeadquarters) return 'Matriz';
    switch (type) {
      case 'headquarters': return 'Matriz';
      case 'branch': return 'Filial';
      case 'franchise': return 'Franquia';
      default: return type;
    }
  };

  const getStoreTypeColor = (type: string, isHeadquarters: boolean) => {
    if (isHeadquarters) return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300';
    switch (type) {
      case 'branch': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'franchise': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const goToModuleStore = () => {
    navigate('/settings', { state: { tab: 'modules' } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-bold">Multi Lojas</h1>
            <ModuleStatusBadge status="ready" />
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie múltiplas filiais em uma única conta
          </p>
        </div>
      </div>

      {/* Permission Warning */}
      {!canManageStores && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Você está visualizando as lojas em modo somente leitura. 
            Para gerenciar lojas, é necessário ter permissão de Administrador ou Gerente.
          </AlertDescription>
        </Alert>
      )}

      {/* Quota Status Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Status das Cotas Multi Lojas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-3 rounded-lg bg-background text-center">
              <p className="text-2xl font-bold text-primary">{stats.quota}</p>
              <p className="text-xs text-muted-foreground">Cotas Adquiridas</p>
            </div>
            <div className="p-3 rounded-lg bg-background text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.used}</p>
              <p className="text-xs text-muted-foreground">Filiais Criadas</p>
            </div>
            <div className="p-3 rounded-lg bg-background text-center">
              <p className={`text-2xl font-bold ${stats.available > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                {stats.available}
              </p>
              <p className="text-xs text-muted-foreground">Disponíveis</p>
            </div>
          </div>
          
          {stats.available === 0 && hasModulePurchased && (
            <Alert className="mt-4 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">
                Cotas esgotadas
              </AlertTitle>
              <AlertDescription className="text-amber-600 dark:text-amber-500">
                Você utilizou todas as suas cotas. Para criar mais filiais, adquira unidades adicionais do módulo Multi Lojas.
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-amber-500 text-amber-700 hover:bg-amber-100"
                  onClick={goToModuleStore}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Comprar mais unidades
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {!hasModulePurchased && (
            <Alert className="mt-4 border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700 dark:text-blue-400">
                Módulo não adquirido
              </AlertTitle>
              <AlertDescription className="text-blue-600 dark:text-blue-500">
                Adquira o módulo Multi Lojas para criar filiais. Cada unidade permite criar 1 filial.
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-blue-500 text-blue-700 hover:bg-blue-100"
                  onClick={goToModuleStore}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Adquirir módulo
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="h-8 w-8 mx-auto text-indigo-600 mb-2" />
            <p className="text-2xl font-bold">{stats.totalStores}</p>
            <p className="text-sm text-muted-foreground">Lojas Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <p className="text-2xl font-bold">{stats.activeStores}</p>
            <p className="text-sm text-muted-foreground">Lojas Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{stats.branches.length}</p>
            <p className="text-sm text-muted-foreground">Filiais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Faturamento</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stores">
            <Building2 className="h-4 w-4 mr-2" />
            Minhas Lojas
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            Consolidado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stores">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Lojas Cadastradas</CardTitle>
                <CardDescription>
                  Gerencie suas filiais e unidades
                </CardDescription>
              </div>
              {canManageStores && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button disabled={!canCreateBranch}>
                              <Plus className="h-4 w-4 mr-2" />
                              Nova Filial
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Adicionar Nova Filial</DialogTitle>
                              <DialogDescription>
                                Cadastre uma nova filial ou franquia (usa 1 cota)
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh]">
                              <div className="space-y-4 pt-4 pr-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Nome da Loja *</Label>
                                    <Input
                                      placeholder="Ex: Filial Centro"
                                      value={newStore.name}
                                      onChange={(e) => setNewStore(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Código *</Label>
                                    <Input
                                      placeholder="Ex: FIL001"
                                      value={newStore.code}
                                      onChange={(e) => setNewStore(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Tipo</Label>
                                  <Select
                                    value={newStore.type}
                                    onValueChange={(value: 'headquarters' | 'branch' | 'franchise') => setNewStore(prev => ({ ...prev, type: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="branch">Filial</SelectItem>
                                      <SelectItem value="franchise">Franquia</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                  <Label>Endereço</Label>
                                  <Input
                                    placeholder="Rua, número"
                                    value={newStore.address}
                                    onChange={(e) => setNewStore(prev => ({ ...prev, address: e.target.value }))}
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label>Cidade</Label>
                                    <Input
                                      placeholder="Cidade"
                                      value={newStore.city}
                                      onChange={(e) => setNewStore(prev => ({ ...prev, city: e.target.value }))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Estado</Label>
                                    <Input
                                      placeholder="UF"
                                      maxLength={2}
                                      value={newStore.state}
                                      onChange={(e) => setNewStore(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>CEP</Label>
                                    <Input
                                      placeholder="00000-000"
                                      value={newStore.zip_code}
                                      onChange={(e) => setNewStore(prev => ({ ...prev, zip_code: e.target.value }))}
                                    />
                                  </div>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input
                                      placeholder="(00) 00000-0000"
                                      value={newStore.phone}
                                      onChange={(e) => setNewStore(prev => ({ ...prev, phone: e.target.value }))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>E-mail</Label>
                                    <Input
                                      type="email"
                                      placeholder="loja@email.com"
                                      value={newStore.email}
                                      onChange={(e) => setNewStore(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Gerente Responsável</Label>
                                  <Input
                                    placeholder="Nome do gerente"
                                    value={newStore.manager_name}
                                    onChange={(e) => setNewStore(prev => ({ ...prev, manager_name: e.target.value }))}
                                  />
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                  </Button>
                                  <Button onClick={handleCreateStore} disabled={createStore.isPending}>
                                    {createStore.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Criar Filial
                                  </Button>
                                </div>
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </span>
                    </TooltipTrigger>
                    {!canCreateBranch && (
                      <TooltipContent>
                        <p>
                          {hasModulePurchased 
                            ? 'Você não tem cotas disponíveis. Compre mais unidades do módulo.' 
                            : 'Adquira o módulo Multi Lojas para criar filiais.'}
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma loja cadastrada</p>
                  <p className="text-sm">A primeira loja criada será automaticamente definida como Matriz</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stores.map((store) => (
                    <div key={store.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                            store.is_headquarters 
                              ? 'bg-indigo-100 dark:bg-indigo-900' 
                              : 'bg-blue-100 dark:bg-blue-900'
                          }`}>
                            <Building2 className={`h-6 w-6 ${
                              store.is_headquarters ? 'text-indigo-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium">{store.name}</h4>
                              <Badge variant="outline" className="font-mono text-xs">
                                {store.code}
                              </Badge>
                              <Badge className={getStoreTypeColor(store.type, store.is_headquarters)}>
                                {getStoreTypeLabel(store.type, store.is_headquarters)}
                              </Badge>
                              {!store.is_active && (
                                <Badge variant="secondary">Inativa</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              {store.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {store.city}{store.state && `, ${store.state}`}
                                </span>
                              )}
                              {store.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {store.phone}
                                </span>
                              )}
                              {store.manager_name && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {store.manager_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="relative flex items-center">
                                  {togglingStoreId === store.id && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full z-10">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  )}
                                  <Switch
                                    checked={store.is_active}
                                    onCheckedChange={(checked) => handleToggleStore(store, checked)}
                                    disabled={isToggleDisabled(store)}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getToggleTooltip(store)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {/* Delete button - only for branches, with consistent spacing */}
                          <div className="w-9 h-9 flex items-center justify-center">
                            {!store.is_headquarters && canManageStores ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => deleteStore.mutate(store.id)}
                                      disabled={deleteStore.isPending}
                                    >
                                      {deleteStore.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Excluir filial</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Relatório Consolidado</CardTitle>
              <CardDescription>
                Visão geral de todas as lojas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stores.length <= 1 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Adicione mais lojas para ver o relatório consolidado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stores.map((store) => (
                    <div key={store.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{store.name}</h4>
                          <Badge variant="outline" className="font-mono text-xs">
                            {store.code}
                          </Badge>
                          <Badge className={getStoreTypeColor(store.type, store.is_headquarters)}>
                            {getStoreTypeLabel(store.type, store.is_headquarters)}
                          </Badge>
                        </div>
                        <Badge className={store.is_active ? 'bg-green-600' : 'bg-muted'}>
                          {store.is_active ? 'Online' : 'Offline'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">-</p>
                          <p className="text-xs text-muted-foreground">Pedidos Hoje</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">-</p>
                          <p className="text-xs text-muted-foreground">Faturamento</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">-</p>
                          <p className="text-xs text-muted-foreground">Ticket Médio</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
