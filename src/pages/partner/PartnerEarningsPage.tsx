/**
 * PartnerEarningsPage - Partner earnings and revenue dashboard
 */

import { useState } from 'react';
import { usePartnerEarnings, usePartnerEarningsSummary } from '@/hooks/usePartnerEarnings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  DollarSign, 
  TrendingUp, 
  Receipt, 
  Building2, 
  RefreshCw,
  Filter,
  Download,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function PartnerEarningsPage() {
  const [filters, setFilters] = useState<{
    status?: string;
    payment_method?: string;
    from_date?: string;
    to_date?: string;
  }>({});

  const { earnings, summary, isLoading, refetch } = usePartnerEarnings(filters);
  const { data: monthlySummary = [] } = usePartnerEarningsSummary();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'settled':
        return <Badge className="bg-primary text-primary-foreground">Liquidado</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'refunded':
        return <Badge variant="destructive">Estornado</Badge>;
      case 'disputed':
        return <Badge variant="outline" className="border-accent text-accent-foreground">Disputa</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case 'pix': return 'PIX';
      case 'credit_card': return 'Crédito';
      case 'debit_card': return 'Débito';
      case 'boleto': return 'Boleto';
      case 'cash': return 'Dinheiro';
      default: return method || '-';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ganhos</h1>
          <p className="text-muted-foreground">Acompanhe sua receita com transações</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ganhos</h1>
          <p className="text-muted-foreground">
            Acompanhe sua receita com transações das organizações
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

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
            <p className="text-xs text-muted-foreground">Total processado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Volume Bruto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalGrossAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Valor total transacionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Seus Ganhos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(summary.totalPartnerEarnings)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.pendingEarnings)} pendente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Repasse Lojistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-foreground">
              {formatCurrency(summary.totalMerchantNet)}
            </div>
            <p className="text-xs text-muted-foreground">Líquido para organizações</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      {monthlySummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
            <CardDescription>Ganhos dos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySummary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => {
                    const [year, month] = value.split('-');
                    return format(new Date(parseInt(year), parseInt(month) - 1), 'MMM/yy', { locale: ptBR });
                  }}
                />
                <YAxis 
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => {
                    const [year, month] = label.split('-');
                    return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy', { locale: ptBR });
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="earnings" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Seus Ganhos"
                />
                <Line 
                  type="monotone" 
                  dataKey="gross" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="Volume Bruto"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(v) => setFilters(prev => ({ 
                  ...prev, 
                  status: v === 'all' ? undefined : v 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="settled">Liquidado</SelectItem>
                  <SelectItem value="refunded">Estornado</SelectItem>
                  <SelectItem value="disputed">Disputa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Método</Label>
              <Select
                value={filters.payment_method || 'all'}
                onValueChange={(v) => setFilters(prev => ({ 
                  ...prev, 
                  payment_method: v === 'all' ? undefined : v 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credit_card">Crédito</SelectItem>
                  <SelectItem value="debit_card">Débito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.from_date || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  from_date: e.target.value || undefined 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.to_date || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  to_date: e.target.value || undefined 
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transações</CardTitle>
              <CardDescription>
                Detalhamento das transações e ganhos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {earnings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Seu Ganho</TableHead>
                  <TableHead className="text-right">Lojista</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((earning) => (
                  <TableRow key={earning.id}>
                    <TableCell>
                      {format(new Date(earning.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {earning.tenant?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodLabel(earning.payment_method)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(earning.gross_amount)}
                    </TableCell>
                    <TableCell className="text-right text-primary font-medium">
                      +{formatCurrency(earning.partner_fee)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(earning.merchant_net)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(earning.status)}
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
