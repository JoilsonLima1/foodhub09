import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, Bell, Search, Filter } from 'lucide-react';
import { useOperationalAlerts } from '@/hooks/useOpsBackoffice';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OpsAlertsPanel() {
  const { alerts, isLoading, acknowledgeAlert, resolveAlert } = useOperationalAlerts();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = !search || 
      alert.title.toLowerCase().includes(search.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'pending' && alert.status === 'pending') ||
      (statusFilter === 'acknowledged' && alert.status === 'acknowledged') ||
      (statusFilter === 'resolved' && alert.status === 'resolved');
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'warning':
        return <Badge variant="secondary">Aviso</Badge>;
      case 'info':
        return <Badge variant="outline">Info</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <Badge variant="default">Resolvido</Badge>;
      case 'acknowledged':
        return <Badge variant="secondary">Reconhecido</Badge>;
      default:
        return <Badge variant="destructive">Pendente</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas Operacionais
            </CardTitle>
            <CardDescription>
              Monitore e gerencie alertas do sistema financeiro
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-lg">
            {filteredAlerts.filter(a => a.status !== 'resolved').length} ativos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alertas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="warning">Aviso</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="acknowledged">Reconhecido</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severidade</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando alertas...
                  </TableCell>
                </TableRow>
              ) : filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum alerta encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{alert.title}</p>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {alert.type}
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(alert.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(alert.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {alert.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert.mutate(alert.id)}
                            disabled={acknowledgeAlert.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            ACK
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => resolveAlert.mutate(alert.id)}
                            disabled={resolveAlert.isPending}
                          >
                            Resolver
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
