import { useAuth } from '@/contexts/AuthContext';
import { useCourierDeliveries } from '@/hooks/useCourierDeliveries';
import { CourierDeliveryCard } from '@/components/courier/CourierDeliveryCard';
import { CourierStats } from '@/components/courier/CourierStats';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, RefreshCw, AlertCircle } from 'lucide-react';

export default function CourierDashboard() {
  const { profile } = useAuth();
  const { deliveries, stats, courierId, isLoading, refetch } = useCourierDeliveries();
  const { updateDeliveryStatus } = useCourierDeliveries();

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 max-w-lg mx-auto">
        <Skeleton className="h-8 w-3/4" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (!courierId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Conta não vinculada</h2>
        <p className="text-muted-foreground max-w-sm">
          Sua conta de usuário não está vinculada a um perfil de entregador.
          Entre em contato com o administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Minhas Entregas
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={refetch}>
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      {/* Saudação */}
      <p className="text-muted-foreground">
        Olá, <span className="font-medium text-foreground">{profile?.full_name}</span>! 👋
      </p>

      {/* Estatísticas */}
      <CourierStats
        total={stats.total}
        pending={stats.pending}
        inRoute={stats.inRoute}
        completed={stats.completed}
      />

      {/* Lista de entregas */}
      <div className="space-y-3">
        {deliveries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhuma entrega para hoje</p>
            <p className="text-sm">Aguarde novas atribuições</p>
          </div>
        ) : (
          deliveries.map((delivery) => (
            <CourierDeliveryCard
              key={delivery.id}
              delivery={delivery}
              onUpdateStatus={updateDeliveryStatus}
            />
          ))
        )}
      </div>
    </div>
  );
}
