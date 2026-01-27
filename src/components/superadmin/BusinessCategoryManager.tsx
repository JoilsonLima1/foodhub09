import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  useManageBusinessCategories, 
  BusinessCategoryConfig,
  CategoryTerminology,
  CategoryFeatures,
  CategoryTheme
} from '@/hooks/useBusinessCategory';
import { 
  UtensilsCrossed, 
  IceCream, 
  Croissant, 
  Coffee, 
  Truck,
  Store,
  Edit2,
  Save,
  X,
  Loader2,
  Palette,
  Type,
  ToggleLeft
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed,
  IceCream,
  Croissant,
  Coffee,
  Truck,
  Store,
};

export function BusinessCategoryManager() {
  const { categories, isLoading, updateCategoryConfig } = useManageBusinessCategories();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BusinessCategoryConfig> | null>(null);

  const startEditing = (category: BusinessCategoryConfig) => {
    setEditingId(category.id);
    setEditForm({ ...category });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveChanges = () => {
    if (!editForm || !editingId) return;
    
    updateCategoryConfig.mutate(
      { id: editingId, ...editForm },
      { onSuccess: () => cancelEditing() }
    );
  };

  const updateTerminology = (key: keyof CategoryTerminology, value: string) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      terminology: { ...editForm.terminology, [key]: value } as CategoryTerminology,
    });
  };

  const updateFeature = (key: keyof CategoryFeatures, value: boolean) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      features: { ...editForm.features, [key]: value } as CategoryFeatures,
    });
  };

  const updateTheme = (key: keyof CategoryTheme, value: string) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      theme: { ...editForm.theme, [key]: value } as CategoryTheme,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Categorias de Negócio</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorias de Negócio</CardTitle>
        <CardDescription>
          Gerencie os nichos disponíveis, seus temas visuais, terminologia e funcionalidades específicas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories?.map((category) => {
          const IconComponent = iconMap[category.icon] || Store;
          const isEditing = editingId === category.id;

          return (
            <Card key={category.id} className="border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `hsl(${category.theme?.primary || '25 95% 53%'} / 0.15)` }}
                    >
                      <IconComponent className="h-5 w-5" style={{ color: `hsl(${category.theme?.primary || '25 95% 53%'})` }} />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {category.name}
                        {!category.is_active && (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditing}
                          disabled={updateCategoryConfig.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveChanges}
                          disabled={updateCategoryConfig.isPending}
                        >
                          {updateCategoryConfig.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Salvar
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(category)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isEditing && editForm && (
                <CardContent className="pt-4">
                  <Accordion type="multiple" className="w-full" defaultValue={['general', 'theme']}>
                    {/* General Settings */}
                    <AccordionItem value="general">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          Configurações Gerais
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ícone</Label>
                            <Input
                              value={editForm.icon || ''}
                              onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                              placeholder="UtensilsCrossed, IceCream, etc."
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Textarea
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editForm.is_active}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                          />
                          <Label>Categoria ativa</Label>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Theme Settings */}
                    <AccordionItem value="theme">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Tema Visual (HSL)
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Cor Primária</Label>
                            <div className="flex gap-2">
                              <div 
                                className="w-10 h-10 rounded border"
                                style={{ backgroundColor: `hsl(${editForm.theme?.primary || ''})` }}
                              />
                              <Input
                                value={editForm.theme?.primary || ''}
                                onChange={(e) => updateTheme('primary', e.target.value)}
                                placeholder="25 95% 53%"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Cor de Destaque</Label>
                            <div className="flex gap-2">
                              <div 
                                className="w-10 h-10 rounded border"
                                style={{ backgroundColor: `hsl(${editForm.theme?.accent || ''})` }}
                              />
                              <Input
                                value={editForm.theme?.accent || ''}
                                onChange={(e) => updateTheme('accent', e.target.value)}
                                placeholder="45 93% 47%"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Sidebar</Label>
                            <div className="flex gap-2">
                              <div 
                                className="w-10 h-10 rounded border"
                                style={{ backgroundColor: `hsl(${editForm.theme?.sidebar || ''})` }}
                              />
                              <Input
                                value={editForm.theme?.sidebar || ''}
                                onChange={(e) => updateTheme('sidebar', e.target.value)}
                                placeholder="0 0% 5%"
                              />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Terminology Settings */}
                    <AccordionItem value="terminology">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          Terminologia
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Produto (singular)</Label>
                            <Input
                              value={editForm.terminology?.product || ''}
                              onChange={(e) => updateTerminology('product', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Produtos (plural)</Label>
                            <Input
                              value={editForm.terminology?.products || ''}
                              onChange={(e) => updateTerminology('products', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Input
                              value={editForm.terminology?.category || ''}
                              onChange={(e) => updateTerminology('category', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Pedido</Label>
                            <Input
                              value={editForm.terminology?.order || ''}
                              onChange={(e) => updateTerminology('order', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Cozinha</Label>
                            <Input
                              value={editForm.terminology?.kitchen || ''}
                              onChange={(e) => updateTerminology('kitchen', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Mesa</Label>
                            <Input
                              value={editForm.terminology?.table || ''}
                              onChange={(e) => updateTerminology('table', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Menu/Cardápio</Label>
                            <Input
                              value={editForm.terminology?.menu || ''}
                              onChange={(e) => updateTerminology('menu', e.target.value)}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Feature Toggles */}
                    <AccordionItem value="features">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <ToggleLeft className="h-4 w-4" />
                          Funcionalidades
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editForm.features?.tables ?? false}
                              onCheckedChange={(checked) => updateFeature('tables', checked)}
                            />
                            <Label>Mesas</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editForm.features?.kitchen_display ?? false}
                              onCheckedChange={(checked) => updateFeature('kitchen_display', checked)}
                            />
                            <Label>Display Cozinha</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editForm.features?.delivery ?? false}
                              onCheckedChange={(checked) => updateFeature('delivery', checked)}
                            />
                            <Label>Delivery</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editForm.features?.pos ?? false}
                              onCheckedChange={(checked) => updateFeature('pos', checked)}
                            />
                            <Label>PDV</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editForm.features?.reservations ?? false}
                              onCheckedChange={(checked) => updateFeature('reservations', checked)}
                            />
                            <Label>Reservas</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editForm.features?.toppings ?? false}
                              onCheckedChange={(checked) => updateFeature('toppings', checked)}
                            />
                            <Label>Toppings</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editForm.features?.pre_orders ?? false}
                              onCheckedChange={(checked) => updateFeature('pre_orders', checked)}
                            />
                            <Label>Encomendas</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editForm.features?.customizations ?? false}
                              onCheckedChange={(checked) => updateFeature('customizations', checked)}
                            />
                            <Label>Customizações</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editForm.features?.location_tracking ?? false}
                              onCheckedChange={(checked) => updateFeature('location_tracking', checked)}
                            />
                            <Label>Rastreamento</Label>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              )}
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
