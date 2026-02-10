import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useStoneAuditLog } from '@/hooks/useStoneProviderAccounts';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function StoneAuditPanel() {
  const { data: logs, isLoading } = useStoneAuditLog();

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log de Auditoria Stone</CardTitle>
      </CardHeader>
      <CardContent>
        {!logs?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro de auditoria encontrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ação</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{log.scope_type || '—'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-64 truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(log.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
