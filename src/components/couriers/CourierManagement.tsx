import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Truck, User } from 'lucide-react';
import { toast } from 'sonner';

interface Courier {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string | null;
  license_plate: string | null;
  is_internal: boolean;
  delivery_fee: number;
  is_active: boolean;
  user_id: string | null;
}

interface CourierFormData {
  name: string;
  phone: string;
  vehicle_type: string;
  license_plate: string;
  is_internal: boolean;
  delivery_fee: string;
  is_active: boolean;
  user_id: string;
}

const initialFormData: CourierFormData = {
  name: '',
  phone: '',
  vehicle_type: 'moto',
  license_plate: '',
  is_internal: true,
  delivery_fee: '0',
  is_active: true,
  user_id: '',
};

export function CourierManagement() {
  const { tenantId, hasRole } = useAuth();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [formData, setFormData] = useState<CourierFormData>(initialFormData);

  const canManage = hasRole('admin') || hasRole('manager') || hasRole('super_admin');

  useEffect(() => {
    if (tenantId) {
      fetchCouriers();
      fetchUsers();
    }
  }, [tenantId]);

  const fetchCouriers = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      setCouriers(data || []);
    } catch (error) {
      console.error('Error fetching couriers:', error);
      toast.error('Erro ao carregar entregadores');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) throw error;
      setUsers((data || []).map(p => ({ id: p.user_id, full_name: p.full_name })));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleOpenDialog = (courier?: Courier) => {
    if (courier) {
      setEditingCourier(courier);
      setFormData({
        name: courier.name,
        phone: courier.phone,
        vehicle_type: courier.vehicle_type || 'moto',
        license_plate: courier.license_plate || '',
        is_internal: courier.is_internal,
        delivery_fee: courier.delivery_fee.toString(),
        is_active: courier.is_active,
        user_id: courier.user_id || '',
      });
    } else {
      setEditingCourier(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      const courierData = {
        tenant_id: tenantId,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        vehicle_type: formData.vehicle_type,
        license_plate: formData.license_plate.trim() || null,
        is_internal: formData.is_internal,
        delivery_fee: parseFloat(formData.delivery_fee) || 0,
        is_active: formData.is_active,
        user_id: formData.user_id || null,
      };

      if (editingCourier) {
        const { error } = await supabase
          .from('couriers')
          .update(courierData)
          .eq('id', editingCourier.id);

        if (error) throw error;
        toast.success('Entregador atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('couriers')
          .insert(courierData);

        if (error) throw error;
        toast.success('Entregador cadastrado com sucesso');
      }

      setIsDialogOpen(false);
      fetchCouriers();
    } catch (error) {
      console.error('Error saving courier:', error);
      toast.error('Erro ao salvar entregador');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este entregador?')) return;

    try {
      const { error } = await supabase
        .from('couriers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Entregador excluído');
      fetchCouriers();
    } catch (error) {
      console.error('Error deleting courier:', error);
      toast.error('Erro ao excluir entregador');
    }
  };

  const vehicleTypes: Record<string, string> = {
    moto: 'Moto',
    carro: 'Carro',
    bicicleta: 'Bicicleta',
    a_pe: 'A pé',
  };

  if (!canManage) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Você não tem permissão para gerenciar entregadores.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Entregadores
          </CardTitle>
          <CardDescription>Gerencie os entregadores do seu estabelecimento</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Entregador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCourier ? 'Editar Entregador' : 'Novo Entregador'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do entregador"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_type">Veículo</Label>
                  <Select
                    value={formData.vehicle_type}
                    onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(vehicleTypes).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license_plate">Placa</Label>
                  <Input
                    id="license_plate"
                    value={formData.license_plate}
                    onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                    placeholder="ABC-1234"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_fee">Taxa de Entrega (R$)</Label>
                <Input
                  id="delivery_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user_id">Vincular a Usuário (para acesso ao App)</Label>
                <Select
                  value={formData.user_id}
                  onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_internal"
                    checked={formData.is_internal}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_internal: checked })}
                  />
                  <Label htmlFor="is_internal">Entregador próprio</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Ativo</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCourier ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : couriers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum entregador cadastrado</p>
            <p className="text-sm">Clique em "Novo Entregador" para começar</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {couriers.map((courier) => (
                  <TableRow key={courier.id}>
                    <TableCell className="font-medium">{courier.name}</TableCell>
                    <TableCell>{courier.phone}</TableCell>
                    <TableCell>
                      {courier.vehicle_type ? vehicleTypes[courier.vehicle_type] || courier.vehicle_type : '-'}
                      {courier.license_plate && (
                        <span className="text-muted-foreground ml-1">({courier.license_plate})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {courier.delivery_fee > 0 
                        ? `R$ ${courier.delivery_fee.toFixed(2)}` 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {courier.user_id ? (
                        <Badge variant="secondary" className="gap-1">
                          <User className="h-3 w-3" />
                          Vinculado
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={courier.is_active ? 'default' : 'secondary'}>
                        {courier.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(courier)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(courier.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
