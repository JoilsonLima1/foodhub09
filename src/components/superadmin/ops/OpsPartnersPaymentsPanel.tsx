/**
 * OpsPartnersPaymentsPanel - Super Admin panel for Partner Payments management
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Play, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

const statusColors: Record<string, string> = {
  'not_started': 'secondary',
  'pending': 'outline',
  'approved': 'default',
  'rejected': 'destructive',
  'disabled': 'secondary',
};

const statusLabels: Record<string, string> = {
  'not_started': 'Não Iniciado',
  'pending': 'Pendente',
  'approved': 'Aprovado',
  'rejected': 'Rejeitado',
  'disabled': 'Desabilitado',
};

export function OpsPartnersPaymentsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingPartner, setProcessingPartner] = useState<string | null>(null);

  const { data: partners, isLoading, refetch } = useQuery({
    queryKey: ['partners-payment-status'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_partners_payment_status');
      if (error) throw error;
      return data as any[];
    },
  });

  const startOnboarding = useMutation({
    mutationFn: async (partnerId: string) => {
      setProcessingPartner(partnerId);
      const { data, error } = await supabase.functions.invoke('partner-payment-ops', {
        body: { action: 'start_onboarding', partner_id: partnerId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Onboarding iniciado', description: `Status: ${data.status}` });
      queryClient.invalidateQueries({ queryKey: ['partners-payment-status'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
    onSettled: () => setProcessingPartner(null),
  });

  const syncStatus = useMutation({
    mutationFn: async (partnerId: string) => {
      setProcessingPartner(partnerId);
      const { data, error } = await supabase.functions.invoke('partner-payment-ops', {
        body: { action: 'sync_status', partner_id: partnerId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Status sincronizado' });
      queryClient.invalidateQueries({ queryKey: ['partners-payment-status'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
    onSettled: () => setProcessingPartner(null),
  });

  const processPayouts = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('partner-payment-ops', {
        body: { action: 'process_payout_jobs' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Payouts processados', description: `${data.processed} jobs processados` });
      queryClient.invalidateQueries({ queryKey: ['partners-payment-status'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pagamentos de Parceiros</CardTitle>
              <CardDescription>Gestão de onboarding, split e repasses</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button size="sm" onClick={() => processPayouts.mutate()} disabled={processPayouts.isPending}>
                {processPayouts.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Processar Payouts
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parceiro</TableHead>
                <TableHead>Status Conta</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead>Split</TableHead>
                <TableHead>Jobs Pendentes</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners?.map((partner: any) => (
                <TableRow key={partner.partner_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{partner.partner_name}</div>
                      {!partner.is_active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[partner.account_status] as any}>
                      {statusLabels[partner.account_status] || partner.account_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{partner.kyc_level}</TableCell>
                  <TableCell>{partner.settlement_mode}</TableCell>
                  <TableCell>
                    {partner.capabilities?.split ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    {partner.pending_payout_jobs > 0 ? (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {partner.pending_payout_jobs}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {partner.account_status === 'not_started' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startOnboarding.mutate(partner.partner_id)}
                          disabled={processingPartner === partner.partner_id}
                        >
                          {processingPartner === partner.partner_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : 'Iniciar'}
                        </Button>
                      )}
                      {partner.account_status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => syncStatus.mutate(partner.partner_id)}
                          disabled={processingPartner === partner.partner_id}
                        >
                          {processingPartner === partner.partner_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : <RefreshCw className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
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
