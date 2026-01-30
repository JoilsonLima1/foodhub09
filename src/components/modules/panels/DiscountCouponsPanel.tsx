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
import { 
  ArrowLeft, 
  Ticket,
  Settings2,
  Plus,
  Users,
  BarChart3,
  Percent,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DiscountCouponsPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number | null;
  max_uses: number | null;
  uses_count: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  description: string | null;
  customer_limit: number | null;
  stackable: boolean | null;
  created_at: string | null;
}

export function DiscountCouponsPanel({ module, onBack }: DiscountCouponsPanelProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: '',
    max_uses: '',
    valid_from: '',
    valid_until: '',
    description: '',
  });

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupons', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!tenantId,
  });

  // Create coupon
  const createCoupon = useMutation({
    mutationFn: async (coupon: typeof newCoupon) => {
      const { data, error } = await supabase
        .from('coupons')
        .insert({
          tenant_id: tenantId,
          code: coupon.code.toUpperCase(),
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          min_order_value: coupon.min_order_value ? parseFloat(coupon.min_order_value) : null,
          max_uses: coupon.max_uses ? parseInt(coupon.max_uses) : null,
          valid_from: coupon.valid_from || null,
          valid_until: coupon.valid_until || null,
          description: coupon.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom criado com sucesso!');
      setIsDialogOpen(false);
      setNewCoupon({
        code: '',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_value: '',
        max_uses: '',
        valid_from: '',
        valid_until: '',
        description: '',
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar cupom: ' + error.message);
    },
  });

  // Toggle coupon
  const toggleCoupon = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Delete coupon
  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom removido');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Stats
  const activeCoupons = coupons.filter(c => c.is_active);
  const totalUses = coupons.reduce((sum, c) => sum + (c.uses_count || 0), 0);
  const avgDiscount = coupons.length > 0
    ? coupons.reduce((sum, c) => sum + c.discount_value, 0) / coupons.length
    : 0;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) {
      toast.error('Digite um código para o cupom');
      return;
    }
    createCoupon.mutate(newCoupon);
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
            <Ticket className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-bold">Cupons de Desconto</h1>
            <ModuleStatusBadge status="ready" />
          </div>
          <p className="text-sm text-muted-foreground">
            Crie cupons personalizados com regras avançadas
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Ticket className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{activeCoupons.length}</p>
            <p className="text-sm text-muted-foreground">Cupons Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{totalUses}</p>
            <p className="text-sm text-muted-foreground">Usos Totais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Percent className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{avgDiscount.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">Desconto Médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">{coupons.length}</p>
            <p className="text-sm text-muted-foreground">Total Cupons</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="coupons" className="space-y-4">
        <TabsList>
          <TabsTrigger value="coupons">
            <Ticket className="h-4 w-4 mr-2" />
            Meus Cupons
          </TabsTrigger>
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            Criar Cupom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons">
          <Card>
            <CardHeader>
              <CardTitle>Cupons Cadastrados</CardTitle>
              <CardDescription>
                Gerencie seus cupons de desconto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhum cupom cadastrado</p>
                  <p className="text-sm">Crie seu primeiro cupom na aba "Criar Cupom"</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {coupons.map((coupon) => (
                      <div
                        key={coupon.id}
                        className="p-4 border rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            coupon.is_active 
                              ? 'bg-green-100 dark:bg-green-900' 
                              : 'bg-muted'
                          }`}>
                            <Ticket className={`h-5 w-5 ${
                              coupon.is_active ? 'text-green-600' : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-mono font-bold">{coupon.code}</h4>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyCode(coupon.code)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                                {coupon.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {coupon.discount_type === 'percentage' 
                                ? `${coupon.discount_value}% de desconto`
                                : `R$ ${coupon.discount_value.toFixed(2)} de desconto`
                              }
                              {coupon.min_order_value && ` • Min: R$ ${coupon.min_order_value}`}
                              {coupon.uses_count !== null && ` • ${coupon.uses_count} usos`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={coupon.is_active}
                            onCheckedChange={(checked) => toggleCoupon.mutate({ id: coupon.id, is_active: checked })}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteCoupon.mutate(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Criar Novo Cupom</CardTitle>
              <CardDescription>
                Configure um novo cupom de desconto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Código do Cupom *</Label>
                    <Input 
                      placeholder="Ex: PRIMEIRACOMPRA" 
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Desconto</Label>
                    <Select 
                      value={newCoupon.discount_type}
                      onValueChange={(value) => setNewCoupon(prev => ({ ...prev, discount_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Valor do Desconto *</Label>
                    <Input 
                      type="number" 
                      placeholder={newCoupon.discount_type === 'percentage' ? 'Ex: 10' : 'Ex: 15.00'}
                      value={newCoupon.discount_value}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pedido Mínimo</Label>
                    <Input 
                      type="number" 
                      placeholder="Valor mínimo (opcional)"
                      value={newCoupon.min_order_value}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, min_order_value: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Input 
                      type="date"
                      value={newCoupon.valid_from}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, valid_from: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Expiração</Label>
                    <Input 
                      type="date"
                      value={newCoupon.valid_until}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, valid_until: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Limite de Usos</Label>
                  <Input 
                    type="number" 
                    placeholder="Deixe vazio para ilimitado"
                    value={newCoupon.max_uses}
                    onChange={(e) => setNewCoupon(prev => ({ ...prev, max_uses: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input 
                    placeholder="Ex: Cupom de boas-vindas"
                    value={newCoupon.description}
                    onChange={(e) => setNewCoupon(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="pt-4">
                  <Button type="submit" disabled={createCoupon.isPending}>
                    {createCoupon.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Criar Cupom
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
