import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiStore, Store } from '@/hooks/useMultiStore';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveStore } from '@/contexts/ActiveStoreContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2,
  Plus,
  MapPin,
  Phone,
  Star,
  AlertCircle,
  Shield,
  Package,
  ShoppingCart,
  Info,
  Check,
  Settings,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Stores() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const { activeStoreId, setActiveStoreId } = useActiveStore();
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

  const isAdmin = roles.includes('admin') || roles.includes('super_admin');

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

    setTogglingStoreId(store.id);
    try {
      await toggleStore.mutateAsync({ id: store.id, is_active: newStatus });
    } finally {
      setTogglingStoreId(null);
    }
  };

  const handleSwitchStore = (storeId: string) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem alternar entre lojas');
      return;
    }
    setActiveStoreId(storeId);
    toast.success('Loja ativa alterada');
  };

  const goToModuleStore = () => {
    navigate('/settings', { state: { tab: 'modules' } });
  };

  const getStoreTypeLabel = (type: string, isHeadquarters: boolean) => {
    if (isHeadquarters) return 'Matriz';
    switch (type) {
      case 'branch': return 'Filial';
      case 'franchise': return 'Franquia';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Multi Lojas</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie suas filiais e alterne entre lojas
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/settings?tab=modules&panel=multi_store')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurar
        </Button>
      </div>

      {/* Permission Warning for non-admins */}
      {!canManageStores && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Você está visualizando as lojas em modo somente leitura. 
            Para gerenciar lojas, é necessário ter permissão de Administrador.
          </AlertDescription>
        </Alert>
      )}

      {/* Quota Status */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Status das Cotas
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
          
          {stats.available === 0 && hasModulePurchased && canManageStores && (
            <Alert className="mt-4 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">
                Cotas esgotadas
              </AlertTitle>
              <AlertDescription className="text-amber-600 dark:text-amber-500">
                Para criar mais filiais, adquira unidades adicionais.
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
        </CardContent>
      </Card>

      {/* Stores List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lojas Cadastradas</CardTitle>
            <CardDescription>
              {stores?.length || 0} loja(s) • Clique em uma loja para ativá-la
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
                            Cadastre uma nova filial (usa 1 cota)
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
                                onValueChange={(value: 'branch' | 'franchise') => setNewStore(prev => ({ ...prev, type: value }))}
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
                          </div>
                        </ScrollArea>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleCreateStore} disabled={createStore.isPending}>
                            {createStore.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Criar Filial
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </span>
                </TooltipTrigger>
                {!canCreateBranch && (
                  <TooltipContent>
                    Você não tem cotas disponíveis para criar novas filiais
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stores?.map((store) => (
              <div
                key={store.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  activeStoreId === store.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => isAdmin && handleSwitchStore(store.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      store.is_headquarters 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{store.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {store.code}
                        </Badge>
                        {store.is_headquarters && (
                          <Badge className="bg-primary/10 text-primary text-[10px]">
                            <Star className="h-3 w-3 mr-1" />
                            Matriz
                          </Badge>
                        )}
                        {activeStoreId === store.id && (
                          <Badge className="bg-green-500/10 text-green-600 text-[10px]">
                            <Check className="h-3 w-3 mr-1" />
                            Ativa
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
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
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {canManageStores && !store.is_headquarters && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={store.is_active}
                                onCheckedChange={(checked) => handleToggleStore(store, checked)}
                                disabled={togglingStoreId === store.id}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {store.is_active ? 'Desativar loja' : 'Ativar loja'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {canManageStores && !store.is_headquarters && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Tem certeza que deseja excluir a loja "${store.name}"?`)) {
                                  deleteStore.mutate(store.id);
                                }
                              }}
                              disabled={deleteStore.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir loja</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(!stores || stores.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma loja cadastrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
