import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Trophy, TrendingDown } from 'lucide-react';
import type { PixPricingPlan } from '@/hooks/usePixAutomatico';

interface Props {
  plans: PixPricingPlan[];
}

export function PixSimulatorTab({ plans }: Props) {
  const [ticketMedio, setTicketMedio] = useState(45);
  const [volumeMensal, setVolumeMensal] = useState(500);

  const results = useMemo(() => {
    const activePlans = plans.filter((p) => p.is_active);
    return activePlans.map((plan) => {
      const feePerTx = Math.max(
        plan.min_fee,
        ticketMedio * plan.percent_rate + plan.fixed_rate
      );
      const cappedFee = plan.max_fee ? Math.min(feePerTx, plan.max_fee) : feePerTx;
      const monthlyCost = cappedFee * volumeMensal;
      return { plan, feePerTx: cappedFee, monthlyCost };
    }).sort((a, b) => a.monthlyCost - b.monthlyCost);
  }, [plans, ticketMedio, volumeMensal]);

  const bestOption = results[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Simulador de Custos PIX
        </CardTitle>
        <CardDescription>
          Calcule o custo estimado por plano com base no ticket médio e volume
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ticket Médio (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={ticketMedio}
              onChange={(e) => setTicketMedio(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Volume Mensal (transações)</Label>
            <Input
              type="number"
              value={volumeMensal}
              onChange={(e) => setVolumeMensal(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Best option highlight */}
        {bestOption && (
          <Alert className="border-primary bg-primary/5">
            <Trophy className="h-4 w-4 text-primary" />
            <AlertDescription>
              <strong>Melhor opção para seu negócio:</strong> {bestOption.plan.name} — 
              custo estimado R$ {bestOption.feePerTx.toFixed(2)}/venda · R$ {bestOption.monthlyCost.toFixed(2)}/mês
            </AlertDescription>
          </Alert>
        )}

        {/* Results grid */}
        <div className="grid gap-3 md:grid-cols-3">
          {results.map(({ plan, feePerTx, monthlyCost }, idx) => (
            <Card key={plan.id} className={idx === 0 ? 'border-primary ring-1 ring-primary/20' : ''}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{plan.name}</span>
                  {idx === 0 && <Badge className="text-xs"><TrendingDown className="h-3 w-3 mr-1" />Menor custo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-sm">
                    <span>Taxa por venda:</span>
                    <span className="font-mono font-medium">R$ {feePerTx.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Custo mensal:</span>
                    <span className="font-mono font-medium">R$ {monthlyCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Fórmula:</span>
                    <span>{(plan.percent_rate * 100).toFixed(2)}% {plan.fixed_rate > 0 ? `+ R$ ${plan.fixed_rate.toFixed(2)}` : ''}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {results.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Nenhum plano PIX ativo encontrado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
