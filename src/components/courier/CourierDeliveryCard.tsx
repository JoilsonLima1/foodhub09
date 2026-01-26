import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Phone,
  Package,
  Navigation,
  Check,
  Truck,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type DeliveryStatus = Database['public']['Enums']['delivery_status'];

interface DeliveryOrder {
  id: string;
  order_number: number;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_neighborhood: string | null;
  delivery_city: string | null;
  total: number;
  notes: string | null;
}

interface CourierDeliveryCardProps {
  delivery: {
    id: string;
    status: DeliveryStatus;
    order: DeliveryOrder;
  };
  onUpdateStatus: (deliveryId: string, newStatus: DeliveryStatus) => void;
}

const statusConfig: Record<DeliveryStatus, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-warning/10 text-warning border-warning/20' },
  assigned: { label: 'Atribuída', color: 'bg-info/10 text-info border-info/20' },
  picked_up: { label: 'Coletada', color: 'bg-primary/10 text-primary border-primary/20' },
  in_route: { label: 'Em Rota', color: 'bg-info/10 text-info border-info/20' },
  delivered: { label: 'Entregue', color: 'bg-success/10 text-success border-success/20' },
  failed: { label: 'Falhou', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function CourierDeliveryCard({ delivery, onUpdateStatus }: CourierDeliveryCardProps) {
  const { order } = delivery;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getFullAddress = () => {
    const parts = [order.delivery_address, order.delivery_neighborhood, order.delivery_city].filter(Boolean);
    return parts.join(', ') || 'Endereço não informado';
  };

  const openMaps = () => {
    const address = encodeURIComponent(getFullAddress());
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  const callCustomer = () => {
    if (order.customer_phone) {
      window.open(`tel:${order.customer_phone}`, '_self');
    }
  };

  const getNextAction = (): { label: string; status: DeliveryStatus; icon: React.ReactNode } | null => {
    switch (delivery.status) {
      case 'pending':
      case 'assigned':
        return { label: 'Coletei', status: 'picked_up', icon: <Package className="h-4 w-4" /> };
      case 'picked_up':
        return { label: 'Em Rota', status: 'in_route', icon: <Truck className="h-4 w-4" /> };
      case 'in_route':
        return { label: 'Entregue', status: 'delivered', icon: <Check className="h-4 w-4" /> };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">#{order.order_number}</span>
            </div>
            <div>
              <p className="font-medium">{order.customer_name || 'Cliente'}</p>
              <p className="text-sm font-semibold text-primary">{formatCurrency(order.total)}</p>
            </div>
          </div>
          <Badge variant="outline" className={statusConfig[delivery.status].color}>
            {statusConfig[delivery.status].label}
          </Badge>
        </div>

        {/* Endereço */}
        <div className="p-4 border-b space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm">{getFullAddress()}</p>
          </div>
          {order.notes && (
            <p className="text-sm text-muted-foreground italic pl-6">{order.notes}</p>
          )}
        </div>

        {/* Ações */}
        <div className="p-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={openMaps}>
            <Navigation className="h-4 w-4 mr-1" />
            Mapa
          </Button>

          {order.customer_phone && (
            <Button variant="outline" size="sm" className="flex-1" onClick={callCustomer}>
              <Phone className="h-4 w-4 mr-1" />
              Ligar
            </Button>
          )}

          {nextAction && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onUpdateStatus(delivery.id, nextAction.status)}
            >
              {nextAction.icon}
              <span className="ml-1">{nextAction.label}</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
