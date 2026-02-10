import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStoneProviderAccounts } from '@/hooks/useStoneProviderAccounts';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Trash2, Plug } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive'; icon: typeof CheckCircle2 }> = {
  active: { variant: 'default', icon: CheckCircle2 },
  inactive: { variant: 'secondary', icon: AlertCircle },
  error: { variant: 'destructive', icon: XCircle },
};

const INTEGRATION_LABELS: Record<string, string> = {
  stone_online: 'Online',
  stone_connect: 'Connect',
  stone_tef: 'TEF',
  stone_openbank: 'OpenBank',
};

export function StoneAccountsTable() {
  const { accounts, isLoading, deleteAccount, testConnection } = useStoneProviderAccounts();

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contas Stone Registradas</CardTitle>
      </CardHeader>
      <CardContent>
        {!accounts?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conta Stone registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Teste</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map(account => {
                const statusConfig = STATUS_BADGE[account.status] || STATUS_BADGE.inactive;
                const StatusIcon = statusConfig.icon;
                return (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.display_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{account.scope_type}</Badge>
                    </TableCell>
                    <TableCell>{INTEGRATION_LABELS[account.integration_type] || account.integration_type}</TableCell>
                    <TableCell>
                      <Badge variant={account.environment === 'production' ? 'default' : 'outline'}>
                        {account.environment === 'production' ? 'Produção' : 'Sandbox'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant} className="flex items-center gap-1 w-fit">
                        <StatusIcon className="h-3 w-3" />
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {account.last_tested_at ? format(new Date(account.last_tested_at), 'dd/MM/yy HH:mm') : '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => testConnection.mutate(account.id)} disabled={testConnection.isPending}>
                        <Plug className="h-3 w-3 mr-1" /> Testar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir conta Stone?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAccount.mutate(account.id)} className="bg-destructive">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
