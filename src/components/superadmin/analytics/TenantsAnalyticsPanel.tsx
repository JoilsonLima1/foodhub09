import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, AlertTriangle, TrendingUp, Users, ShoppingCart, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';

type Stage = 'ALL' | 'ACTIVE' | 'CONFIGURING' | 'LOGGED_IN' | 'NEW' | 'INACTIVE';

const STAGE_LABELS: Record<Stage, string> = {
  ALL: 'Todos',
  ACTIVE: 'Ativo',
  CONFIGURING: 'Configurando',
  LOGGED_IN: 'Logou',
  NEW: 'Novo',
  INACTIVE: 'Inativo',
};

const STAGE_BADGE: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  ACTIVE: 'default',
  CONFIGURING: 'secondary',
  LOGGED_IN: 'outline',
  NEW: 'outline',
  INACTIVE: 'destructive',
};

type TenantRow = {
  tenant_id: string;
  tenant_name: string | null;
  tenant_whatsapp: string | null;
  tenant_phone: string | null;
  tenant_email: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  last_login_at: string | null;
  last_seen_at: string | null;
  geo_last_region: string | null;
  geo_last_city: string | null;
  display_region: string | null;
  display_city: string | null;
  logins_7d: number;
  products_count: number;
  sales_count_30d: number;
  sales_amount_30d: number;
  activation_stage: string;
  funnel_step: string;
  risk_flag: boolean;
  is_active: boolean;
  tenant_created_at: string | null;
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
    <button
      onClick={handleCopy}
      className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
      title={`Copiar ${label ?? ''}`}
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function TenantsAnalyticsPanel() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Stage>('ALL');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['tenant_360_summary_v2'],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_tenant_360_summary' as any);
      if (error) throw error;
      return (data ?? []) as TenantRow[];
    },
  });

  const filtered = rows.filter((r) => {
    const matchStage = filter === 'ALL' || r.activation_stage === filter;
    const q = search.toLowerCase();
    const matchSearch = !search
      || r.tenant_name?.toLowerCase().includes(q)
      || r.tenant_id?.toLowerCase().includes(q)
      || r.owner_email?.toLowerCase().includes(q)
      || r.owner_name?.toLowerCase().includes(q)
      || r.tenant_whatsapp?.includes(q)
      || r.display_region?.toLowerCase().includes(q)
      || r.display_city?.toLowerCase().includes(q);
    return matchStage && matchSearch;
  });

  const atRisk = rows.filter((r) => r.risk_flag).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> Total
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{rows.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {rows.filter((r) => r.activation_stage === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Em Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{atRisk}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" /> Vendas 30d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rows.reduce((s, r) => s + (r.sales_count_30d || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por loja, email, nome, WhatsApp, UF, cidade..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(STAGE_LABELS) as Stage[]).map((s) => (
            <Button
              key={s}
              variant={filter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {STAGE_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Loja</TableHead>
                <TableHead className="min-w-[130px]">Dono</TableHead>
                <TableHead className="min-w-[160px]">Email</TableHead>
                <TableHead className="min-w-[120px]">WhatsApp</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead className="min-w-[120px]">Último Login</TableHead>
                <TableHead className="min-w-[120px]">Último Acesso</TableHead>
                <TableHead className="min-w-[110px]">UF / Cidade</TableHead>
                <TableHead className="text-center">Logins 7d</TableHead>
                <TableHead className="text-center">Produtos</TableHead>
                <TableHead className="text-center">Vendas 30d</TableHead>
                <TableHead className="min-w-[100px]">Valor 30d</TableHead>
                <TableHead>Risco</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                    Nenhum dado encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => {
                const whatsapp = r.tenant_whatsapp || r.owner_phone;
                const email = r.owner_email || r.tenant_email;
                const region = r.display_region || r.geo_last_region;
                const city = r.display_city || r.geo_last_city;
                return (
                  <TableRow key={r.tenant_id} className={r.risk_flag ? 'bg-destructive/5' : ''}>
                    {/* Loja */}
                    <TableCell>
                      <div className="font-medium text-sm">{r.tenant_name || '—'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.tenant_id?.slice(0, 8)}…</div>
                    </TableCell>

                    {/* Dono */}
                    <TableCell className="text-sm">{r.owner_name || '—'}</TableCell>

                    {/* Email */}
                    <TableCell>
                      {email ? (
                        <span className="flex items-center text-xs">
                          <span className="truncate max-w-[130px]" title={email}>{email}</span>
                          <CopyButton value={email} label="email" />
                        </span>
                      ) : '—'}
                    </TableCell>

                    {/* WhatsApp */}
                    <TableCell>
                      {whatsapp ? (
                        <span className="flex items-center gap-1 text-xs">
                          <a
                            href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {whatsapp}
                          </a>
                          <CopyButton value={whatsapp} label="WhatsApp" />
                        </span>
                      ) : '—'}
                    </TableCell>

                    {/* Estágio */}
                    <TableCell>
                      <Badge variant={STAGE_BADGE[r.activation_stage] ?? 'outline'}>
                        {r.activation_stage}
                      </Badge>
                    </TableCell>

                    {/* Último Login */}
                    <TableCell className="text-xs">
                      {r.last_login_at
                        ? formatDistanceToNow(new Date(r.last_login_at), { locale: ptBR, addSuffix: true })
                        : <span className="text-muted-foreground italic">Nunca logou</span>}
                    </TableCell>

                    {/* Último Acesso */}
                    <TableCell className="text-xs">
                      {r.last_seen_at
                        ? (
                          <span title={new Date(r.last_seen_at).toLocaleString('pt-BR')}>
                            {formatDistanceToNow(new Date(r.last_seen_at), { locale: ptBR, addSuffix: true })}
                          </span>
                        )
                        : '—'}
                    </TableCell>

                    {/* UF/Cidade */}
                    <TableCell className="text-xs">
                      {[region, city].filter(Boolean).join(' / ') || '—'}
                    </TableCell>

                    {/* Logins 7d */}
                    <TableCell className="text-center">{r.logins_7d ?? 0}</TableCell>

                    {/* Produtos */}
                    <TableCell className="text-center">{r.products_count ?? 0}</TableCell>

                    {/* Vendas 30d */}
                    <TableCell className="text-center">{r.sales_count_30d ?? 0}</TableCell>

                    {/* Valor 30d */}
                    <TableCell className="text-xs">
                      {r.sales_amount_30d
                        ? `R$ ${Number(r.sales_amount_30d).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </TableCell>

                    {/* Risco */}
                    <TableCell>
                      {r.risk_flag && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
