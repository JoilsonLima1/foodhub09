import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Activity, ShoppingCart, Package, Users, MapPin, Globe } from 'lucide-react';

const EVENT_ICONS: Record<string, string> = {
  user_signed_up: '🆕',
  user_logged_in: '🔑',
  tenant_created: '🏢',
  product_created: '📦',
  sale_completed: '💰',
};

export function Tenant360Panel() {
  const [tenantId, setTenantId] = useState('');
  const [search, setSearch] = useState('');

  const { data: health } = useQuery({
    queryKey: ['tenant_health_single', tenantId],
    enabled: tenantId.length === 36,
    queryFn: async () => {
      const { data } = await supabase
        .from('tenant_health' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['tenant_events_360', tenantId],
    enabled: tenantId.length === 36,
    queryFn: async () => {
      const { data } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(200);
      return (data ?? []) as any[];
    },
  });

  const filteredEvents = search
    ? events.filter((e) =>
        e.event_name.includes(search) ||
        JSON.stringify(e.metadata).includes(search)
      )
    : events;

  // Funnel steps
  const funnelSteps = [
    { key: 'user_signed_up',  label: 'Cadastrou',        icon: '🆕' },
    { key: 'user_logged_in',  label: 'Logou',            icon: '🔑' },
    { key: 'tenant_created',  label: 'Criou Conta',      icon: '🏢' },
    { key: 'product_created', label: 'Criou Produto',    icon: '📦' },
    { key: 'sale_completed',  label: 'Fez Venda',        icon: '💰' },
  ];

  const funnelDone = new Set(events.map((e: any) => e.event_name));

  return (
    <div className="space-y-4">
      {/* Tenant selector */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cole o UUID do tenant..."
            className="pl-8 font-mono"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value.trim())}
          />
        </div>
      </div>

      {tenantId.length !== 36 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Cole o UUID de um tenant para ver sua visão 360º.
        </p>
      )}

      {tenantId.length === 36 && (
        <div className="space-y-4">
          {/* Health Cards */}
          {health && (
            <div className="grid gap-3 md:grid-cols-6">
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Estágio</CardTitle></CardHeader>
                <CardContent><Badge>{health.activation_stage}</Badge></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Logins 7d</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{health.logins_7d}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Produtos</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{health.products_count}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Vendas 30d</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{health.sales_count_30d}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Valor 30d</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {health.sales_amount_30d
                      ? `R$ ${Number(health.sales_amount_30d).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
                      : '—'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">UF / Cidade</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[health.geo_last_region, health.geo_last_city].filter(Boolean).join(' / ') || '—'}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Funnel */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Funil de Ativação</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                {funnelSteps.map((step, i) => (
                  <div key={step.key} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border
                      ${funnelDone.has(step.key)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-muted-foreground/30'}`}>
                      <span>{step.icon}</span>
                      {step.label}
                    </div>
                    {i < funnelSteps.length - 1 && (
                      <span className="text-muted-foreground">→</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Timeline de Eventos ({events.length})</CardTitle>
              <Input
                placeholder="Filtrar eventos..."
                className="w-48 h-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </CardHeader>
            <CardContent>
              {loadingEvents && (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              )}
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {filteredEvents.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="flex items-start gap-3 py-2 px-3 rounded-md hover:bg-muted/50 text-sm"
                  >
                    <span className="text-base mt-0.5">
                      {EVENT_ICONS[ev.event_name] ?? '📌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary">{ev.event_name}</span>
                        {ev.city && (
                          <span className="text-xs text-muted-foreground">
                            📍 {ev.region} / {ev.city}
                          </span>
                        )}
                      </div>
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {JSON.stringify(ev.metadata)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(ev.created_at), { locale: ptBR, addSuffix: true })}
                    </span>
                  </div>
                ))}
                {filteredEvents.length === 0 && !loadingEvents && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum evento encontrado.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
