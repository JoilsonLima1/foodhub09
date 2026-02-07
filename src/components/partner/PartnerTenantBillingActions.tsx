/**
 * PartnerTenantBillingActions - Billing actions for partner tenant management
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, Receipt, CheckCircle } from 'lucide-react';

interface PartnerTenantBillingActionsProps {
  tenantId: string;
  tenantSubscriptionId: string;
  tenantName: string;
  planName: string;
  planPrice: number;
  subscriptionStatus: string;
  onSuccess?: () => void;
}

export function PartnerTenantBillingActions({
  tenantId,
  tenantSubscriptionId,
  tenantName,
  planName,
  planPrice,
  subscriptionStatus,
  onSuccess,
}: PartnerTenantBillingActionsProps) {
  const { toast } = useToast();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isManualActivateOpen, setIsManualActivateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [billingType, setBillingType] = useState('UNDEFINED');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const sanitizeCpfCnpj = (value: string) => value.replace(/\D/g, '');
  const isValidCpfCnpj = (value: string) => {
    const digits = sanitizeCpfCnpj(value);
    return digits.length === 11 || digits.length === 14;
  };

  const handleCreateCheckout = async () => {
    if (!isValidCpfCnpj(cpfCnpj)) {
      toast({
        title: 'CPF/CNPJ inválido',
        description: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('partner-tenant-checkout', {
        body: {
          tenant_id: tenantId,
          tenant_subscription_id: tenantSubscriptionId,
          gateway: 'asaas',
          customer_cpf_cnpj: sanitizeCpfCnpj(cpfCnpj),
          billing_type: billingType,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: 'Link de pagamento gerado',
          description: 'O link de pagamento foi aberto em uma nova aba.',
        });
        setIsCheckoutOpen(false);
        onSuccess?.();
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error: any) {
      console.error('[PartnerTenantBillingActions] Error:', error);
      toast({
        title: 'Erro ao gerar cobrança',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualActivate = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('activate_partner_tenant_subscription', {
        p_tenant_subscription_id: tenantSubscriptionId,
        p_payment_provider: 'manual',
        p_gateway_payment_id: null,
      });

      if (error) throw error;

      const result = data as { success?: boolean; error?: string } | null;
      if (result?.success) {
        toast({
          title: 'Assinatura ativada',
          description: `${tenantName} foi ativada manualmente.`,
        });
        setIsManualActivateOpen(false);
        onSuccess?.();
      } else {
        throw new Error(result?.error || 'Falha ao ativar');
      }
    } catch (error: any) {
      console.error('[PartnerTenantBillingActions] Error:', error);
      toast({
        title: 'Erro ao ativar',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isTrialOrPending = ['trial', 'pending', 'expired', 'past_due'].includes(subscriptionStatus);

  return (
    <>
      <div className="flex gap-2">
        {isTrialOrPending && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCheckoutOpen(true)}
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Cobrar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsManualActivateOpen(true)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Ativar Manual
            </Button>
          </>
        )}
        {subscriptionStatus === 'active' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCheckoutOpen(true)}
          >
            <Receipt className="h-4 w-4 mr-1" />
            Nova Fatura
          </Button>
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Cobrança</DialogTitle>
            <DialogDescription>
              {tenantName} - {planName} ({formatCurrency(planPrice)}/mês)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpf-cnpj">CPF/CNPJ do Cliente</Label>
              <Input
                id="cpf-cnpj"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                placeholder="Digite o CPF ou CNPJ"
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                Necessário para emissão do boleto/PIX pelo Asaas.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <RadioGroup value={billingType} onValueChange={setBillingType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="UNDEFINED" id="undefined" />
                  <Label htmlFor="undefined" className="font-normal cursor-pointer">
                    Cliente escolhe (PIX, Boleto ou Cartão)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PIX" id="pix" />
                  <Label htmlFor="pix" className="font-normal cursor-pointer">
                    PIX
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="BOLETO" id="boleto" />
                  <Label htmlFor="boleto" className="font-normal cursor-pointer">
                    Boleto Bancário
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CREDIT_CARD" id="credit_card" />
                  <Label htmlFor="credit_card" className="font-normal cursor-pointer">
                    Cartão de Crédito
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCheckout} disabled={isProcessing || !isValidCpfCnpj(cpfCnpj)}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Gerar Link de Pagamento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Activate Dialog */}
      <Dialog open={isManualActivateOpen} onOpenChange={setIsManualActivateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ativar Manualmente</DialogTitle>
            <DialogDescription>
              Ativar {tenantName} sem aguardar confirmação de pagamento?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Esta ação irá ativar a assinatura imediatamente, liberando acesso 
              ao plano <strong>{planName}</strong> por 30 dias.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Use esta opção para cobranças manuais/offline onde você já recebeu 
              o pagamento por outros meios.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsManualActivateOpen(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleManualActivate} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ativando...
                </>
              ) : (
                'Confirmar Ativação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
