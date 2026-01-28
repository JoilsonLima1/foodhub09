import { Check, Clock, ChefHat, Package, Truck, MapPin, Home, X, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';

// Customer-friendly status labels in Portuguese
export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Aguardando Pagamento',
  paid: 'Pedido Registrado',
  confirmed: 'Pedido Confirmado',
  preparing: 'Em Preparação',
  ready: 'Pronto para Retirada',
  out_for_delivery: 'Saiu para Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

// Status order for timeline progression
const STATUS_ORDER: OrderStatus[] = [
  'paid',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
];

const DELIVERY_STATUS_ORDER: OrderStatus[] = [
  'paid',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
];

const PICKUP_STATUS_ORDER: OrderStatus[] = [
  'paid',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
];

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  isDelivery: boolean;
  history?: Array<{
    status: OrderStatus;
    created_at: string;
    notes?: string | null;
  }>;
}

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case 'pending_payment':
      return Clock;
    case 'paid':
    case 'confirmed':
      return Receipt;
    case 'preparing':
      return ChefHat;
    case 'ready':
      return Package;
    case 'out_for_delivery':
      return Truck;
    case 'delivered':
      return Home;
    case 'cancelled':
      return X;
    default:
      return Clock;
  }
};

const getStatusColor = (status: OrderStatus, isActive: boolean, isPast: boolean) => {
  if (status === 'cancelled') return 'text-destructive bg-destructive/10 border-destructive';
  if (isActive) return 'text-primary bg-primary/10 border-primary animate-pulse';
  if (isPast) return 'text-green-600 bg-green-100 border-green-600';
  return 'text-muted-foreground bg-muted border-muted-foreground/30';
};

export function OrderTimeline({ currentStatus, isDelivery, history = [] }: OrderTimelineProps) {
  const statusOrder = isDelivery ? DELIVERY_STATUS_ORDER : PICKUP_STATUS_ORDER;
  
  // Handle cancelled status separately
  if (currentStatus === 'cancelled') {
    return (
      <div className="flex flex-col items-center py-8">
        <div className="w-16 h-16 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center">
          <X className="w-8 h-8 text-destructive" />
        </div>
        <p className="mt-4 text-lg font-medium text-destructive">Pedido Cancelado</p>
      </div>
    );
  }

  const currentIndex = statusOrder.indexOf(currentStatus);
  const historyMap = new Map(history.map(h => [h.status, h]));

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-muted">
        <div
          className="absolute top-0 left-0 w-full bg-primary transition-all duration-500"
          style={{
            height: `${Math.max(0, (currentIndex / (statusOrder.length - 1)) * 100)}%`,
          }}
        />
      </div>

      {/* Status steps */}
      <div className="space-y-6">
        {statusOrder.map((status, index) => {
          const isPast = index < currentIndex;
          const isActive = index === currentIndex;
          const isFuture = index > currentIndex;
          const Icon = getStatusIcon(status);
          const historyEntry = historyMap.get(status);

          return (
            <div
              key={status}
              className={cn(
                'relative flex items-start gap-4 transition-opacity duration-300',
                isFuture && 'opacity-50'
              )}
            >
              {/* Icon circle */}
              <div
                className={cn(
                  'relative z-10 w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                  getStatusColor(status, isActive, isPast)
                )}
              >
                {isPast ? (
                  <Check className="w-8 h-8" />
                ) : (
                  <Icon className="w-8 h-8" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-3">
                <p
                  className={cn(
                    'font-semibold transition-colors',
                    isActive && 'text-primary',
                    isPast && 'text-green-600',
                    isFuture && 'text-muted-foreground'
                  )}
                >
                  {CUSTOMER_STATUS_LABELS[status]}
                </p>
                {historyEntry && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(historyEntry.created_at)} às {formatTime(historyEntry.created_at)}
                  </p>
                )}
                {isActive && !historyEntry && (
                  <p className="text-sm text-muted-foreground mt-1">Em andamento...</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
