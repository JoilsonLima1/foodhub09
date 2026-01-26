import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  User, 
  MapPin, 
  CreditCard, 
  ChefHat, 
  CheckCircle,
  Package,
  Truck,
  XCircle,
  FileText
} from 'lucide-react';
import type { OrderWithDetails } from '@/hooks/useOrders';
import type { OrderStatus, PaymentMethod } from '@/types/database';

interface OrderCardProps {
  order: OrderWithDetails;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  formatCurrency: (value: number) => string;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending_payment: { label: 'Aguardando Pagamento', color: 'bg-yellow-500', icon: <Clock className="h-3 w-3" /> },
  paid: { label: 'Pago', color: 'bg-blue-500', icon: <CreditCard className="h-3 w-3" /> },
  confirmed: { label: 'Confirmado', color: 'bg-indigo-500', icon: <CheckCircle className="h-3 w-3" /> },
  preparing: { label: 'Preparando', color: 'bg-orange-500', icon: <ChefHat className="h-3 w-3" /> },
  ready: { label: 'Pronto', color: 'bg-green-500', icon: <Package className="h-3 w-3" /> },
  out_for_delivery: { label: 'Saiu para Entrega', color: 'bg-purple-500', icon: <Truck className="h-3 w-3" /> },
  delivered: { label: 'Entregue', color: 'bg-emerald-600', icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelado', color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
};

const originLabels: Record<string, string> = {
  pos: 'PDV',
  online: 'Online',
  whatsapp: 'WhatsApp',
  ifood: 'iFood',
  marketplace: 'Marketplace',
};

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  credit_card: 'Crédito',
  debit_card: 'Débito',
  voucher: 'Voucher',
  mixed: 'Misto',
};

export function OrderCard({ order, onUpdateStatus, formatCurrency }: OrderCardProps) {
  const status = statusConfig[order.status];
  const createdAt = new Date(order.created_at);
  const timeStr = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = createdAt.toLocaleDateString('pt-BR');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">#{order.order_number}</span>
            <Badge variant="outline" className="text-xs">
              {originLabels[order.origin] || order.origin}
            </Badge>
          </div>
          <Badge className={`${status.color} text-white flex items-center gap-1`}>
            {status.icon}
            {status.label}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeStr}
          </span>
          <span>{dateStr}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Customer Info */}
        {order.customer_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{order.customer_name}</span>
          </div>
        )}

        {order.is_delivery && order.delivery_address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground">{order.delivery_address}</span>
          </div>
        )}

        {/* Items */}
        <div className="border-t pt-2">
          <div className="space-y-1">
            {order.items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.product_name}
                  {item.variation_name && ` (${item.variation_name})`}
                </span>
                <span className="text-muted-foreground">{formatCurrency(item.total_price)}</span>
              </div>
            ))}
            {order.items.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{order.items.length - 3} {order.items.length - 3 === 1 ? 'item' : 'itens'}
              </p>
            )}
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="flex items-start gap-2 text-sm bg-muted/50 p-2 rounded">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground italic">{order.notes}</span>
          </div>
        )}

        {/* Total and Payment */}
        <div className="border-t pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            {order.payments.length > 0 && (
              <span className="text-sm">
                {paymentLabels[order.payments[0].payment_method] || order.payments[0].payment_method}
              </span>
            )}
          </div>
          <span className="text-lg font-bold">{formatCurrency(order.total)}</span>
        </div>

        {/* Quick Actions */}
        {onUpdateStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="flex gap-2 pt-2">
            {order.status === 'paid' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onUpdateStatus(order.id, 'preparing')}
              >
                <ChefHat className="h-4 w-4 mr-1" />
                Preparar
              </Button>
            )}
            {order.status === 'preparing' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onUpdateStatus(order.id, 'ready')}
              >
                <Package className="h-4 w-4 mr-1" />
                Pronto
              </Button>
            )}
            {order.status === 'ready' && !order.is_delivery && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onUpdateStatus(order.id, 'delivered')}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Entregue
              </Button>
            )}
            {order.status === 'ready' && order.is_delivery && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onUpdateStatus(order.id, 'out_for_delivery')}
              >
                <Truck className="h-4 w-4 mr-1" />
                Enviar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
