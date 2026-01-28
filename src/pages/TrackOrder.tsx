import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Package, 
  Bell, 
  BellOff, 
  RefreshCw, 
  UtensilsCrossed,
  Clock,
  MapPin,
  Truck
} from 'lucide-react';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { OrderTimeline, CUSTOMER_STATUS_LABELS } from '@/components/tracking/OrderTimeline';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from '@/hooks/use-toast';

export default function TrackOrder() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderFromUrl = searchParams.get('pedido');
  
  const [searchValue, setSearchValue] = useState(orderFromUrl || '');
  const [activeOrderNumber, setActiveOrderNumber] = useState<number | null>(
    orderFromUrl ? parseInt(orderFromUrl) : null
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const { order, history, isLoading, isError, refetch } = useOrderTracking(
    activeOrderNumber,
    tenantId
  );

  const { 
    isSupported: pushSupported, 
    permission, 
    requestPermission,
    notifyGeneral 
  } = usePushNotifications();

  // Update URL when order number changes
  useEffect(() => {
    if (activeOrderNumber) {
      setSearchParams({ pedido: activeOrderNumber.toString() });
    }
  }, [activeOrderNumber, setSearchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const orderNum = parseInt(searchValue);
    if (!isNaN(orderNum) && orderNum > 0) {
      setActiveOrderNumber(orderNum);
    } else {
      toast({
        title: 'Número inválido',
        description: 'Digite um número de pedido válido.',
        variant: 'destructive',
      });
    }
  };

  const handleEnableNotifications = async () => {
    if (!pushSupported) {
      toast({
        title: 'Não suportado',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return;
    }

    const granted = await requestPermission();
    if (granted) {
      setNotificationsEnabled(true);
      toast({
        title: 'Notificações ativadas!',
        description: 'Você receberá atualizações sobre seu pedido.',
      });
      // Test notification
      notifyGeneral(
        '🔔 Notificações Ativadas',
        'Você será notificado sobre atualizações do seu pedido.'
      );
    } else {
      toast({
        title: 'Permissão negada',
        description: 'Habilite as notificações nas configurações do navegador.',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-40">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            {order?.tenant_logo_url ? (
              <img
                src={order.tenant_logo_url}
                alt={order.tenant_name}
                className="h-8 w-auto"
              />
            ) : (
              <UtensilsCrossed className="h-6 w-6 text-primary" />
            )}
            <h1 className="text-xl font-bold">
              {order?.tenant_name || 'Acompanhar Pedido'}
            </h1>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Digite o número do pedido..."
                className="pl-10"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                min="1"
              />
            </div>
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-2xl mx-auto px-4 py-6">
        {!activeOrderNumber && !isLoading && (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Acompanhe seu pedido</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Digite o número do seu pedido acima para ver o status em tempo real.
            </p>
          </div>
        )}

        {isLoading && activeOrderNumber && (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        )}

        {isError && (
          <Card className="border-destructive">
            <CardContent className="py-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
              <h3 className="font-semibold text-destructive mb-2">Pedido não encontrado</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Não encontramos nenhum pedido com o número #{activeOrderNumber}.
              </p>
              <Button variant="outline" onClick={() => setActiveOrderNumber(null)}>
                Tentar outro número
              </Button>
            </CardContent>
          </Card>
        )}

        {order && !isLoading && (
          <div className="space-y-4">
            {/* Order summary card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Pedido #{order.order_number}
                  </CardTitle>
                  <Badge
                    variant={order.status === 'delivered' ? 'default' : 'secondary'}
                    className={
                      order.status === 'delivered'
                        ? 'bg-green-600'
                        : order.status === 'cancelled'
                        ? 'bg-destructive'
                        : ''
                    }
                  >
                    {CUSTOMER_STATUS_LABELS[order.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDateTime(order.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {order.is_delivery ? (
                      <>
                        <Truck className="h-4 w-4" />
                        <span>Entrega</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4" />
                        <span>Retirada</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(order.total)}
                  </span>
                </div>

                {order.estimated_time_minutes && order.status !== 'delivered' && (
                  <div className="mt-3 p-3 bg-muted rounded-lg flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Tempo estimado: <strong>{order.estimated_time_minutes} min</strong>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              {pushSupported && (
                <Button
                  variant={notificationsEnabled ? 'secondary' : 'default'}
                  size="sm"
                  onClick={handleEnableNotifications}
                  disabled={notificationsEnabled || permission === 'denied'}
                  className="flex-1"
                >
                  {notificationsEnabled ? (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Notificações Ativas
                    </>
                  ) : permission === 'denied' ? (
                    <>
                      <BellOff className="h-4 w-4 mr-2" />
                      Bloqueadas
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Ativar Notificações
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimeline
                  currentStatus={order.status}
                  isDelivery={order.is_delivery}
                  history={history}
                />
              </CardContent>
            </Card>

            {/* Help text */}
            <p className="text-center text-sm text-muted-foreground">
              Esta página atualiza automaticamente a cada 30 segundos.
              {notificationsEnabled && ' Você também receberá notificações push.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
