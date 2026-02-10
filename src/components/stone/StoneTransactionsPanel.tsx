import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStoneTransactions } from '@/hooks/useStoneProviderAccounts';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default',
  pending: 'secondary',
  canceled: 'outline',
  refunded: 'outline',
  failed: 'destructive',
  chargeback: 'destructive',
};

interface Props {
  tenantId: string | null;
}

export function StoneTransactionsPanel({ tenantId }: Props) {
  const { data: transactions, isLoading } = useStoneTransactions(
    tenantId ? { tenant_id: tenantId } : undefined
  );

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Stone</CardTitle>
      </CardHeader>
      <CardContent>
        {!transactions?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação encontrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref. Interna</TableHead>
                <TableHead>Ref. Provider</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(tx => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-xs">{tx.internal_reference || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{tx.provider_reference || '—'}</TableCell>
                  <TableCell className="font-medium">
                    {tx.currency} {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="capitalize">{tx.method?.replace('_', ' ') || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[tx.status] || 'secondary'} className="capitalize">
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(tx.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
