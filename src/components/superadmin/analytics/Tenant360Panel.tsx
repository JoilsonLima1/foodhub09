import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, MapPin, Copy, Check, Phone, Mail, MessageCircle,
  Clock, ShieldAlert, Activity,
} from 'lucide-react';
import { toast } from 'sonner';

const EVENT_ICONS: Record<string, string> = {
  user_signed_up: '🆕',
  user_logged_in: '🔑',
  tenant_created: '🏢',
  product_created: '📦',
  sale_completed: '💰',
};

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 gap-1 text-xs">
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
      {label}
    </Button>
  );
}

export function Tenant360Panel() {
  const [tenantId, setTenantId] = useState('');
  const [search, setSearch] = useState('');

  const { data: summary } = useQuery({
    queryKey: ['tenant_360_single_summary', tenantId],
    enabled: tenantId.length === 36,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_single_tenant_360' as any, { _tenant_id: tenantId });
      if (error) throw error;
      return ((data ?? []) as any[])[0] ?? null;
    },
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['tenant_events_360_v3', tenantId],
    enabled: tenantId.length === 36,
    queryFn: async () => {
      const { data } = await supabase
        .from('analytics_events' as any)
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

  const funnelSteps = [
    { key: 'user_signed_up',  label: 'Cadastrou',     icon: '🆕' },
    { key: 'user_logged_in',  label: 'Logou',          icon: '🔑' },
    { key: 'tenant_created',  label: 'Criou Conta',   icon: '🏢' },
    { key: 'product_created', label: 'Criou Produto', icon: '📦' },
    { key: 'sale_completed',  label: 'Fez Venda',     icon: '💰' },
  ];
  const funnelDone = new Set(events.map((e: any) => e.event_name));

  const daysSinceAccess = summary?.last_seen_at
    ? differenceInDays(new Date(), new Date(summary.last_seen_at))
    : null;

  const whatsapp = summary?.tenant_whatsapp || summary?.owner_phone;
  const email = summary?.owner_email || summary?.tenant_email;
  const region = summary?.display_region || summary?.geo_last_region;
  const city = summary?.display_city || summary?.geo_last_city;

  return (
    <div className="space-y-4">
      {/* Tenant selector */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cole o UUID do tenant..."
          className="pl-8 font-mono"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value.trim())}
        />
      </div>

      {tenantId.length !== 36 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Cole o UUID de um tenant para ver sua visão 360º.
        </p>
      )}

      {tenantId.length === 36 && (
        <div className="space-y-4">
          {/* Identidade */}
          {summary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  🏢 Identidade da Loja
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Loja */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Nome da Loja</p>
                    <p className="font-semibold text-lg">{summary.tenant_name || '—'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{tenantId}</p>
                  </div>
                  {/* Dono */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Responsável</p>
                    <p className="font-medium">{summary.owner_name || '—'}</p>
                  </div>

                  {/* Email */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </p>
                    {email ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{email}</span>
                        <CopyButton value={email} label="Copiar" />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => window.open(`mailto:${email}`)}
                        >
                          <Mail className="h-3 w-3" /> Enviar
                        </Button>
                      </div>
                    ) : <span className="text-sm text-muted-foreground italic">Sem email</span>}
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> WhatsApp / Telefone
                    </p>
                    {whatsapp ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{whatsapp}</span>
                        <CopyButton value={whatsapp} label="Copiar" />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1 border-primary text-primary hover:bg-primary/10"
                          onClick={() => window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}`, '_blank')}
                        >
                          <MessageCircle className="h-3 w-3" /> WhatsApp
                        </Button>
                      </div>
                    ) : <span className="text-sm text-muted-foreground italic">Sem WhatsApp</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Atividade */}
          {summary && (
            <div className="grid gap-3 md:grid-cols-4">
              {/* Último Login */}
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Último Login
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.last_login_at ? (
                    <>
                      <div className="text-sm font-medium">
                        {formatDistanceToNow(new Date(summary.last_login_at), { locale: ptBR, addSuffix: true })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(summary.last_login_at).toLocaleString('pt-BR')}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Nunca logou</div>
                  )}
                </CardContent>
              </Card>

              {/* Último Acesso */}
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Último Acesso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.last_seen_at ? (
                    <>
                      <div className="text-sm font-medium">
                        {formatDistanceToNow(new Date(summary.last_seen_at), { locale: ptBR, addSuffix: true })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(summary.last_seen_at).toLocaleString('pt-BR')}
                      </div>
                    </>
                  ) : '—'}
                </CardContent>
              </Card>

              {/* Dias sem acesso */}
              <Card className={daysSinceAccess !== null && daysSinceAccess > 14 ? 'border-destructive/50' : ''}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Dias sem Acesso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${daysSinceAccess !== null && daysSinceAccess > 14 ? 'text-destructive' : ''}`}>
                    {daysSinceAccess !== null ? daysSinceAccess : '—'}
                  </div>
                </CardContent>
              </Card>

              {/* UF/Cidade */}
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Localização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">
                    {[region, city].filter(Boolean).join(' / ') || '—'}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Health Cards */}
          {summary && (
            <div className="grid gap-3 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Estágio</CardTitle></CardHeader>
                <CardContent><Badge>{summary.activation_stage}</Badge></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Logins 7d</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{summary.logins_7d}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Produtos</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{summary.products_count}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Vendas 30d</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{summary.sales_count_30d}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Valor 30d</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {summary.sales_amount_30d
                      ? `R$ ${Number(summary.sales_amount_30d).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
                      : '—'}
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
