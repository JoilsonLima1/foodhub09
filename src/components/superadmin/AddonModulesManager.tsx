import { useState } from 'react';
import { 
  useAddonModules, 
  AddonModule, 
  AddonModuleCategory,
  ImplementationStatus,
  ADDON_CATEGORY_LABELS 
} from '@/hooks/useAddonModules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Pencil, 
  Trash2, 
  Package,
  Loader2,
  Truck,
  Zap,
  MessageSquare,
  Phone,
  Award,
  Ticket,
  MonitorPlay,
  Smartphone,
  CreditCard,
  MonitorCheck,
  PackageCheck,
  Send,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  Truck,
  Zap,
  MessageSquare,
  Phone,
  Award,
  Ticket,
  MonitorPlay,
  Smartphone,
  CreditCard,
  MonitorCheck,
  PackageCheck,
  Send,
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

interface ModuleFormData {
  slug: string;
  name: string;
  description: string;
  category: AddonModuleCategory;
  icon: string;
  monthly_price: number;
  setup_fee: number;
  features: string;
  requirements: string;
  is_active: boolean;
  display_order: number;
  implementation_status: ImplementationStatus;
}

const defaultFormData: ModuleFormData = {
  slug: '',
  name: '',
  description: '',
  category: 'integrations',
  icon: 'Package',
  monthly_price: 0,
  setup_fee: 0,
  features: '',
  requirements: '',
  is_active: true,
  display_order: 0,
  implementation_status: 'coming_soon',
};

const IMPLEMENTATION_STATUS_LABELS: Record<ImplementationStatus, string> = {
  ready: 'Pronto',
  beta: 'Beta',
  coming_soon: 'Em Breve',
  development: 'Desenvolvimento',
};

export function AddonModulesManager() {
  const { modules, isLoading, createModule, updateModule, deleteModule } = useAddonModules();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<AddonModule | null>(null);
  const [formData, setFormData] = useState<ModuleFormData>(defaultFormData);
  const [selectedCategory, setSelectedCategory] = useState<AddonModuleCategory | 'all'>('all');

  const handleOpenDialog = (module?: AddonModule) => {
    if (module) {
      setEditingModule(module);
      setFormData({
        slug: module.slug,
        name: module.name,
        description: module.description || '',
        category: module.category,
        icon: module.icon,
        monthly_price: module.monthly_price,
        setup_fee: module.setup_fee,
        features: Array.isArray(module.features) ? module.features.join('\n') : '',
        requirements: module.requirements || '',
        is_active: module.is_active,
        display_order: module.display_order,
        implementation_status: module.implementation_status || 'coming_soon',
      });
    } else {
      setEditingModule(null);
      setFormData({
        ...defaultFormData,
        display_order: (modules?.length || 0) + 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingModule(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async () => {
    const moduleData = {
      slug: formData.slug,
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      icon: formData.icon,
      monthly_price: formData.monthly_price,
      setup_fee: formData.setup_fee,
      features: formData.features.split('\n').filter(f => f.trim()),
      requirements: formData.requirements || null,
      is_active: formData.is_active,
      display_order: formData.display_order,
      currency: 'BRL',
      implementation_status: formData.implementation_status,
    };

    if (editingModule) {
      await updateModule.mutateAsync({ id: editingModule.id, ...moduleData });
    } else {
      await createModule.mutateAsync(moduleData);
    }
    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este módulo?')) {
      await deleteModule.mutateAsync(id);
    }
  };

  const filteredModules = modules?.filter(
    m => selectedCategory === 'all' || m.category === selectedCategory
  );

  const IconComponent = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || Package;
    return <Icon className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Catálogo de Módulos</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os módulos adicionais disponíveis para venda
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Módulo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
              </DialogTitle>
              <DialogDescription>
                {editingModule 
                  ? 'Atualize as informações do módulo adicional.'
                  : 'Adicione um novo módulo ao catálogo.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (identificador)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="integration_99food"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="99Food"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o módulo..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: AddonModuleCategory) => 
                      setFormData(prev => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ADDON_CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Ícone</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ICONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            {IconComponent(icon)}
                            <span>{icon}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_order">Ordem</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      display_order: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_price">Preço Mensal (R$)</Label>
                  <Input
                    id="monthly_price"
                    type="number"
                    step="0.01"
                    value={formData.monthly_price}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      monthly_price: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup_fee">Taxa de Setup (R$)</Label>
                  <Input
                    id="setup_fee"
                    type="number"
                    step="0.01"
                    value={formData.setup_fee}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      setup_fee: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="features">Funcionalidades (uma por linha)</Label>
                <Textarea
                  id="features"
                  value={formData.features}
                  onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                  placeholder="Recebimento automático de pedidos&#10;Sincronização de cardápio&#10;..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requisitos</Label>
                <Input
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="Ex: Requer hardware específico"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">Módulo ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.slug || !formData.name || createModule.isPending || updateModule.isPending}
              >
                {(createModule.isPending || updateModule.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingModule ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as AddonModuleCategory | 'all')}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          {Object.entries(ADDON_CATEGORY_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredModules?.map((module) => (
              <Card key={module.id} className={!module.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {IconComponent(module.icon)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{module.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {ADDON_CATEGORY_LABELS[module.category]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenDialog(module)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(module.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">
                    {module.description}
                  </CardDescription>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                      R$ {module.monthly_price.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  {module.setup_fee > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      + R$ {module.setup_fee.toFixed(2)} de setup
                    </p>
                  )}
                  {Array.isArray(module.features) && module.features.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {module.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                      {module.features.length > 3 && (
                        <li className="text-xs text-muted-foreground">
                          +{module.features.length - 3} mais...
                        </li>
                      )}
                    </ul>
                  )}
                  {!module.is_active && (
                    <Badge variant="secondary" className="mt-3">
                      Inativo
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
