/**
 * TenantBillingCouponPage - Apply coupon codes to next invoice
 * Phase 12: Add-ons, Proration, Coupons, Entitlements
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Ticket, Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useTenantCoupons } from '@/hooks/useTenantCoupons';
import { format } from 'date-fns';

export default function TenantBillingCouponPage() {
  const { 
    pendingCoupons, 
    isLoading, 
    applyCoupon, 
    isApplying 
  } = useTenantCoupons();

  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    
    try {
      await applyCoupon(code.trim().toUpperCase());
      setResult({ success: true, message: 'Cupom aplicado com sucesso! O desconto será aplicado na próxima fatura.' });
      setCode('');
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Cupom inválido ou expirado.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ticket className="h-6 w-6" />
          Cupom de Desconto
        </h1>
        <p className="text-muted-foreground">Aplique um cupom para obter desconto na próxima fatura</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aplicar Cupom</CardTitle>
          <CardDescription>Insira o código do cupom promocional</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Digite o código do cupom"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setResult(null);
              }}
              className="font-mono uppercase"
            />
            <Button onClick={handleApply} disabled={!code.trim() || isApplying}>
              {isApplying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Aplicar
            </Button>
          </div>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Pending Coupons */}
      {pendingCoupons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cupons Pendentes</CardTitle>
            <CardDescription>Descontos que serão aplicados nas próximas faturas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingCoupons.map((pending) => (
                <div key={pending.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Ticket className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono font-bold">{pending.coupon?.code || 'Cupom'}</p>
                      <p className="text-sm text-muted-foreground">
                        Aplicado em {format(new Date(pending.created_at), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {pending.coupon?.discount_type === 'percent' 
                      ? `${pending.coupon.discount_value}% OFF` 
                      : pending.coupon 
                        ? `R$ ${pending.coupon.discount_value.toFixed(2)} OFF`
                        : 'Desconto'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pendingCoupons.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Nenhum cupom aplicado</AlertTitle>
          <AlertDescription>
            Quando você aplicar um cupom válido, ele aparecerá aqui e será usado automaticamente na próxima fatura.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
