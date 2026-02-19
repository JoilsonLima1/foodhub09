import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { MapPin } from 'lucide-react';

export function GeoDistributionPanel() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['analytics_geo_distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_geo_distribution' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
    },
  });

  // Group by region
  const byRegion = rows.reduce<Record<string, { cities: any[]; tenant_count: number }>>((acc, row) => {
    const key = row.region || 'Desconhecido';
    if (!acc[key]) acc[key] = { cities: [], tenant_count: 0 };
    acc[key].cities.push(row);
    acc[key].tenant_count += Number(row.tenant_count || 0);
    return acc;
  }, {});

  const regions = Object.entries(byRegion).sort((a, b) => b[1].tenant_count - a[1].tenant_count);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Distribuição Geográfica por UF
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          )}
          {!isLoading && regions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum dado geográfico disponível ainda. Os dados aparecerão conforme eventos forem capturados com localização.
            </p>
          )}
          {regions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UF / Região</TableHead>
                  <TableHead className="text-center">Tenants</TableHead>
                  <TableHead className="text-center">Usuários</TableHead>
                  <TableHead className="text-center">Eventos</TableHead>
                  <TableHead>Principais Cidades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regions.map(([region, data]) => (
                  <TableRow key={region}>
                    <TableCell className="font-semibold">{region}</TableCell>
                    <TableCell className="text-center font-bold text-primary">
                      {data.tenant_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {data.cities.reduce((s, c) => s + Number(c.user_count || 0), 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      {data.cities.reduce((s, c) => s + Number(c.event_count || 0), 0)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {data.cities
                        .sort((a, b) => b.tenant_count - a.tenant_count)
                        .slice(0, 5)
                        .map((c) => `${c.city} (${c.tenant_count})`)
                        .join(', ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top cities */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 20 Cidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {[...rows]
                .sort((a, b) => b.tenant_count - a.tenant_count)
                .slice(0, 20)
                .map((r, i) => (
                  <div key={`${r.region}-${r.city}`} className="flex items-center gap-2 p-2 rounded-md border">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.city}</p>
                      <p className="text-xs text-muted-foreground">{r.region} · {r.tenant_count} tenants</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
