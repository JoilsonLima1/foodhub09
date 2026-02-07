/**
 * PartnerFees - Manage partner transaction fee configuration
 */

import { useState, useEffect } from 'react';
import { usePartnerFeeConfig } from '@/hooks/usePartnerData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, CreditCard, Percent, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PartnerFeesPage() {
  const { feeConfig, isLoading, updateFeeConfig } = usePartnerFeeConfig();

  const [formData, setFormData] = useState({
    is_enabled: false,
    platform_fee_percent: 0,
    platform_fee_fixed: 0,
    pix_fee_percent: 0,
    credit_fee_percent: 0,
    debit_fee_percent: 0,
    boleto_fee_fixed: 0,
  });

  useEffect(() => {
    if (feeConfig) {
      setFormData({
        is_enabled: feeConfig.is_enabled ?? false,
        platform_fee_percent: feeConfig.platform_fee_percent ?? 0,
        platform_fee_fixed: feeConfig.platform_fee_fixed ?? 0,
        pix_fee_percent: feeConfig.pix_fee_percent ?? 0,
        credit_fee_percent: feeConfig.credit_fee_percent ?? 0,
        debit_fee_percent: feeConfig.debit_fee_percent ?? 0,
        boleto_fee_fixed: feeConfig.boleto_fee_fixed ?? 0,
      });
    }
  }, [feeConfig]);

  const handleSave = () => {
    updateFeeConfig.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Taxas de Transação</h1>
          <p className="text-muted-foreground">Configure as taxas cobradas das suas organizações</p>
        </div>
        <div className="grid gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
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
          <h1 className="text-2xl font-bold">Taxas de Transação</h1>
          <p className="text-muted-foreground">
            Configure as taxas aplicadas sobre transações das organizações
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateFeeConfig.isPending}>
          {updateFeeConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Alterações
        </Button>
      </div>

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Monetização Ativa</CardTitle>
              <CardDescription>
                Ative para cobrar taxas sobre transações das organizações
              </CardDescription>
            </div>
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_enabled: v }))}
            />
          </div>
        </CardHeader>
      </Card>

      {formData.is_enabled && (
        <>
          {/* Platform Fees */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Taxa da Plataforma</CardTitle>
              </div>
              <CardDescription>
                Taxa base aplicada sobre todas as transações
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Taxa Percentual (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.platform_fee_percent}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    platform_fee_percent: Number(e.target.value) 
                  }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa Fixa (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.platform_fee_fixed}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    platform_fee_fixed: Number(e.target.value) 
                  }))}
                  placeholder="0.00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Fees */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Taxas por Método de Pagamento</CardTitle>
              </div>
              <CardDescription>
                Taxas adicionais por método de pagamento (somadas à taxa da plataforma)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>PIX (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pix_fee_percent}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      pix_fee_percent: Number(e.target.value) 
                    }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Débito (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.debit_fee_percent}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      debit_fee_percent: Number(e.target.value) 
                    }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Crédito (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.credit_fee_percent}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      credit_fee_percent: Number(e.target.value) 
                    }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Boleto (R$ fixo)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.boleto_fee_fixed}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      boleto_fee_fixed: Number(e.target.value) 
                    }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Example Calculation */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Exemplo de Cálculo</CardTitle>
              </div>
              <CardDescription>
                Simulação de taxa para uma transação de R$ 100,00
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 text-center">
                {['PIX', 'Débito', 'Crédito', 'Boleto'].map((method, i) => {
                  const methodFees: Record<string, number> = {
                    'PIX': formData.pix_fee_percent,
                    'Débito': formData.debit_fee_percent,
                    'Crédito': formData.credit_fee_percent,
                    'Boleto': 0,
                  };
                  const fixedFees: Record<string, number> = {
                    'PIX': 0,
                    'Débito': 0,
                    'Crédito': 0,
                    'Boleto': formData.boleto_fee_fixed,
                  };
                  
                  const percentFee = 100 * ((formData.platform_fee_percent + methodFees[method]) / 100);
                  const fixedFee = formData.platform_fee_fixed + fixedFees[method];
                  const totalFee = percentFee + fixedFee;

                  return (
                    <Card key={method}>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">{method}</p>
                        <p className="text-lg font-bold text-primary">
                          R$ {totalFee.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ({((totalFee / 100) * 100).toFixed(2)}%)
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
