import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useServiceCalls, useAcknowledgeServiceCall, useResolveServiceCall } from '@/hooks/useServiceCalls';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/utils';
import { SERVICE_CALL_TYPE_LABELS, SERVICE_CALL_STATUS_LABELS, type ServiceCallStatus } from '@/types/digitalService';
import { Bell, Clock, CheckCircle, AlertCircle, User, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceCallsPanelProps {
  waiterId?: string;
}

export function ServiceCallsPanel({ waiterId }: ServiceCallsPanelProps) {
  const { data: calls, isLoading } = useServiceCalls(['pending', 'acknowledged', 'in_progress']);
  const acknowledgeCall = useAcknowledgeServiceCall();
  const resolveCall = useResolveServiceCall();

  const pendingCalls = calls?.filter((c) => c.status === 'pending') || [];
  const activeCalls = calls?.filter((c) => c.status === 'acknowledged' || c.status === 'in_progress') || [];

  const getCallIcon = (type: string) => {
    switch (type) {
      case 'waiter':
        return <User className="h-5 w-5" />;
      case 'bill':
        return <CheckCircle className="h-5 w-5" />;
      case 'cash_payment':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getCallPriorityColor = (priority: number, status: string) => {
    if (status === 'pending') {
      if (priority >= 3) return 'border-destructive bg-destructive/10';
      if (priority >= 2) return 'border-orange-500 bg-orange-50 dark:bg-orange-900/10';
    }
    return 'border-border';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Calls */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-destructive animate-pulse" />
          <h3 className="text-lg font-semibold">Chamados Pendentes</h3>
          {pendingCalls.length > 0 && (
            <Badge variant="destructive">{pendingCalls.length}</Badge>
          )}
        </div>

        {pendingCalls.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum chamado pendente
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingCalls.map((call) => (
              <Card
                key={call.id}
                className={cn(
                  'border-2 transition-all hover:shadow-md',
                  getCallPriorityColor(call.priority, call.status)
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCallIcon(call.call_type)}
                      <CardTitle className="text-base">
                        {SERVICE_CALL_TYPE_LABELS[call.call_type]}
                      </CardTitle>
                    </div>
                    <Badge variant="destructive">Novo</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {call.table ? `Mesa ${call.table.number}` : 'Balcão'}
                    {call.comanda && ` • Comanda #${call.comanda.comanda_number}`}
                  </div>

                  {call.customer && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      {call.customer.full_name}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDateTime(call.created_at)}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => acknowledgeCall.mutate({ callId: call.id, waiterId })}
                    disabled={acknowledgeCall.isPending}
                  >
                    Aceitar Chamado
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Active Calls */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Em Atendimento</h3>
          {activeCalls.length > 0 && (
            <Badge variant="secondary">{activeCalls.length}</Badge>
          )}
        </div>

        {activeCalls.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum chamado em atendimento
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeCalls.map((call) => (
              <Card key={call.id} className="border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCallIcon(call.call_type)}
                      <CardTitle className="text-base">
                        {SERVICE_CALL_TYPE_LABELS[call.call_type]}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary">
                      {SERVICE_CALL_STATUS_LABELS[call.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {call.table ? `Mesa ${call.table.number}` : 'Balcão'}
                  </div>

                  {call.response_time_seconds && (
                    <div className="text-sm text-muted-foreground">
                      Aceito em {call.response_time_seconds}s
                    </div>
                  )}

                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => resolveCall.mutate({ callId: call.id })}
                    disabled={resolveCall.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como Resolvido
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
