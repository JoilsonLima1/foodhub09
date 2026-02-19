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
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, AlertTriangle, TrendingUp, Users, ShoppingCart } from 'lucide-react';

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

export function TenantsAnalyticsPanel() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Stage>('ALL');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['tenant_health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_health' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 60_000,
  });

  const filtered = rows.filter((r) => {
    const matchStage = filter === 'ALL' || r.activation_stage === filter;
    const matchSearch = !search || r.tenant_id?.toLowerCase().includes(search.toLowerCase())
      || r.geo_last_city?.toLowerCase().includes(search.toLowerCase())
      || r.geo_last_region?.toLowerCase().includes(search.toLowerCase())
      || r.first_utm_source?.toLowerCase().includes(search.toLowerCase());
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
            placeholder="Buscar por tenant, UF, cidade, origem..."
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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant ID</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>Funil</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Logins 7d</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Vendas 30d</TableHead>
                <TableHead>Valor 30d</TableHead>
                <TableHead>UF / Cidade</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Risco</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    Nenhum dado encontrado. Os dados aparecerão conforme eventos forem capturados.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.tenant_id} className={r.risk_flag ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-mono text-xs">{r.tenant_id?.slice(0, 8)}…</TableCell>
                  <TableCell>
                    <Badge variant={STAGE_BADGE[r.activation_stage] ?? 'outline'}>
                      {r.activation_stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.funnel_step}</TableCell>
                  <TableCell className="text-xs">
                    {r.last_seen_at
                      ? formatDistanceToNow(new Date(r.last_seen_at), { locale: ptBR, addSuffix: true })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-center">{r.logins_7d ?? 0}</TableCell>
                  <TableCell className="text-center">{r.products_count ?? 0}</TableCell>
                  <TableCell className="text-center">{r.sales_count_30d ?? 0}</TableCell>
                  <TableCell>
                    {r.sales_amount_30d
                      ? `R$ ${Number(r.sales_amount_30d).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {[r.geo_last_region, r.geo_last_city].filter(Boolean).join(' / ') || '—'}
                  </TableCell>
                  <TableCell className="text-xs">{r.first_utm_source || '—'}</TableCell>
                  <TableCell>
                    {r.risk_flag && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
