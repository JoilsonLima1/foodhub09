import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, DollarSign, TrendingDown, Receipt, Info, FileText, Percent } from 'lucide-react';
import { useTenantFees } from '@/hooks/useTenantFees';
import { usePaymentTerms } from '@/hooks/usePaymentTerms';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentTermsAcceptanceDialog } from './PaymentTermsAcceptanceDialog';
import { useEffect, useState } from 'react';

export function TenantFeesView() {
  const { ledgerEntries, summary, hasOverride, isLoading, calculateFee } = useTenantFees();
  const { activeTerms, needsAcceptance, acceptance } = usePaymentTerms();
  const [feeBreakdown, setFeeBreakdown] = useState<{
    pix: { percent: number; fixed: number } | null;
    credit_card: { percent: number; fixed: number } | null;
    boleto: { percent: number; fixed: number } | null;
    plan: string | null;
  }>({ pix: null, credit_card: null, boleto: null, plan: null });

  useEffect(() => {
    async function loadFees() {
      const [pixFee, cardFee, boletoFee] = await Promise.all([
        calculateFee(100, 'pix'),
        calculateFee(100, 'credit_card'),
        calculateFee(100, 'boleto'),
      ]);
      setFeeBreakdown({
        pix: pixFee ? { percent: pixFee.percent_applied, fixed: pixFee.fixed_applied } : null,
        credit_card: cardFee ? { percent: cardFee.percent_applied, fixed: cardFee.fixed_applied } : null,
        boleto: boletoFee ? { percent: boletoFee.percent_applied, fixed: boletoFee.fixed_applied } : null,
        plan: pixFee?.tenant_plan || null,
      });
    }
    loadFees();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Terms Acceptance Banner */}
      {needsAcceptance && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <FileText className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-yellow-800 dark:text-yellow-200">
              Você precisa aceitar os termos de pagamento atualizados para continuar usando os serviços de pagamento.
            </span>
            <PaymentTermsAcceptanceDialog />
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Taxas e Transações
        </h2>
        <p className="text-muted-foreground text-sm">
          Visualize as taxas aplicadas às suas transações
        </p>
      </div>

      {/* Fee Breakdown by Method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Suas Taxas por Método de Pagamento
          </CardTitle>
          <CardDescription>
            Taxas aplicadas conforme seu plano{' '}
            {feeBreakdown.plan && (
              <Badge variant="secondary" className="ml-1 capitalize">{feeBreakdown.plan}</Badge>
            )}
            {hasOverride && (
              <Badge variant="outline" className="ml-1">Personalizada</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { key: 'pix', label: 'PIX', data: feeBreakdown.pix },
              { key: 'credit_card', label: 'Cartão de Crédito', data: feeBreakdown.credit_card },
              { key: 'boleto', label: 'Boleto', data: feeBreakdown.boleto },
            ].map(({ key, label, data }) => (
              <div key={key} className="rounded-lg border p-4 text-center">
                <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
                <p className="text-2xl font-bold">
                  {data ? `${data.percent}%` : '—'}
                </p>
                {data && data.fixed > 0 && (
                  <p className="text-xs text-muted-foreground">+ R$ {data.fixed.toFixed(2)}</p>
                )}
                {data && data.percent === 0 && data.fixed === 0 && (
                  <p className="text-xs text-green-600 font-medium">Isento</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Taxa operacional conforme plano contratado. Para detalhes sobre sua taxa específica, consulte seu plano de assinatura.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Total processadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Valor Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {summary.totalNetReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Recebido após taxas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              Taxas Gateway
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {summary.totalGatewayFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Cobradas pelo gateway</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              Taxas Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {summary.totalPlatformFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Taxa operacional</p>
          </CardContent>
        </Card>
      </div>

      {/* Terms Acceptance Status */}
      {acceptance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Termos de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">
                  Versão <span className="font-mono font-medium">{acceptance.terms_version}</span> aceita em{' '}
                  {format(new Date(acceptance.accepted_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <Badge className="bg-green-500">Aceito</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>
            Últimas transações e taxas aplicadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ledgerEntries && ledgerEntries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Transação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.transaction_id.substring(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        entry.entry_type === 'merchant_net' ? 'default' :
                        entry.entry_type === 'platform_fee' ? 'secondary' :
                        entry.entry_type === 'gateway_fee' ? 'outline' : 'destructive'
                      }>
                        {entry.entry_type === 'merchant_net' && 'Líquido'}
                        {entry.entry_type === 'platform_fee' && 'Taxa Plataforma'}
                        {entry.entry_type === 'gateway_fee' && 'Taxa Gateway'}
                        {entry.entry_type === 'refund' && 'Estorno'}
                        {entry.entry_type === 'chargeback' && 'Chargeback'}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {entry.payment_method?.replace('_', ' ') || '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      entry.entry_type === 'merchant_net' ? 'text-green-600' : 
                      entry.entry_type === 'refund' || entry.entry_type === 'chargeback' ? 'text-red-600' :
                      'text-muted-foreground'
                    }`}>
                      {entry.entry_type === 'merchant_net' ? '+' : '-'}
                      R$ {Math.abs(entry.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma transação registrada ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
