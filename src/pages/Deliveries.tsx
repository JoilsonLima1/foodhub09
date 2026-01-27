import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Truck,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  Users,
} from 'lucide-react';
import { DELIVERY_STATUS_LABELS } from '@/lib/constants';
import type { DeliveryStatus } from '@/types/database';
import { CourierManagement } from '@/components/couriers/CourierManagement';

interface Delivery {
  id: string;
  status: DeliveryStatus;
  created_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  order: {
    id: string;
    order_number: number;
    customer_name: string | null;
    customer_phone: string | null;
    delivery_address: string | null;
    total: number;
  };
  courier: {
    id: string;
    name: string;
    phone: string;
  } | null;
}

interface Courier {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
}

export default function Deliveries() {
  const { tenantId } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDeliveries = async () => {
    if (!tenantId) return;

    try {
      let query = supabase
        .from('deliveries')
        .select(`
          id,
          status,
          created_at,
          picked_up_at,
          delivered_at,
          order:orders (
            id,
            order_number,
            customer_name,
            customer_phone,
            delivery_address,
            total
          ),
          courier:couriers (
            id,
            name,
            phone
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as DeliveryStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDeliveries(data as Delivery[]);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCouriers = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('id, name, phone, is_active')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) throw error;
      setCouriers(data || []);
    } catch (error) {
      console.error('Error fetching couriers:', error);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    fetchCouriers();
  }, [tenantId, statusFilter]);

  const updateDeliveryStatus = async (deliveryId: string, newStatus: DeliveryStatus) => {
    try {
      const updates: Record<string, any> = { status: newStatus };
      
      if (newStatus === 'picked_up') {
        updates.picked_up_at = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('deliveries')
        .update(updates)
        .eq('id', deliveryId);

      if (error) throw error;
      fetchDeliveries();
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  };

  const assignCourier = async (deliveryId: string, courierId: string) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ 
          courier_id: courierId,
          status: 'assigned',
        })
        .eq('id', deliveryId);

      if (error) throw error;
      fetchDeliveries();
    } catch (error) {
      console.error('Error assigning courier:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: DeliveryStatus) => {
    const colors: Record<DeliveryStatus, string> = {
      pending: 'bg-warning/10 text-warning border-warning/20',
      assigned: 'bg-info/10 text-info border-info/20',
      picked_up: 'bg-info/10 text-info border-info/20',
      in_route: 'bg-primary/10 text-primary border-primary/20',
      delivered: 'bg-success/10 text-success border-success/20',
      failed: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return colors[status] || '';
  };

  const getNextAction = (status: DeliveryStatus): { label: string; nextStatus: DeliveryStatus } | null => {
    const actions: Record<string, { label: string; nextStatus: DeliveryStatus }> = {
      assigned: { label: 'Coletar Pedido', nextStatus: 'picked_up' },
      picked_up: { label: 'Iniciar Rota', nextStatus: 'in_route' },
      in_route: { label: 'Marcar Entregue', nextStatus: 'delivered' },
    };
    return actions[status] || null;
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      delivery.order?.order_number?.toString().includes(search) ||
      delivery.order?.customer_name?.toLowerCase().includes(search) ||
      delivery.courier?.name?.toLowerCase().includes(search)
    );
  });

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nenhum restaurante configurado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6" />
          Entregas
        </h1>
        <p className="text-muted-foreground">
          Gerencie entregas e entregadores
        </p>
      </div>

      <Tabs defaultValue="deliveries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deliveries" className="gap-2">
            <Truck className="h-4 w-4" />
            Entregas
          </TabsTrigger>
          <TabsTrigger value="couriers" className="gap-2">
            <Users className="h-4 w-4" />
            Entregadores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por pedido, cliente ou entregador..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Deliveries List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-32" />
                </Card>
              ))}
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma entrega encontrada</h3>
                <p className="text-muted-foreground">
                  As entregas aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDeliveries.map((delivery) => (
                <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Order Info */}
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-primary">
                            #{delivery.order?.order_number}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">
                              {delivery.order?.customer_name || 'Cliente anônimo'}
                            </span>
                            <Badge variant="outline" className={getStatusColor(delivery.status)}>
                              {DELIVERY_STATUS_LABELS[delivery.status]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            {delivery.order?.customer_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {delivery.order.customer_phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(delivery.created_at)}
                            </span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(delivery.order?.total || 0)}
                            </span>
                          </div>
                          {delivery.order?.delivery_address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {delivery.order.delivery_address}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Courier and Actions */}
                      <div className="flex items-center gap-4 flex-wrap">
                        {delivery.courier ? (
                          <div className="flex items-center gap-2 text-sm bg-muted px-3 py-2 rounded-lg">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{delivery.courier.name}</span>
                          </div>
                        ) : delivery.status === 'pending' ? (
                          <Select onValueChange={(courierId) => assignCourier(delivery.id, courierId)}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Atribuir entregador" />
                            </SelectTrigger>
                            <SelectContent>
                              {couriers.map((courier) => (
                                <SelectItem key={courier.id} value={courier.id}>
                                  {courier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}

                        {getNextAction(delivery.status) && (
                          <Button
                            size="sm"
                            onClick={() => updateDeliveryStatus(
                              delivery.id, 
                              getNextAction(delivery.status)!.nextStatus
                            )}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {getNextAction(delivery.status)!.label}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="couriers">
          <CourierManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
