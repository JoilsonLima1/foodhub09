import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { useActivePaymentGateways } from '@/hooks/useActivePaymentGateways';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: 'plan' | 'module';
  itemId: string;
  itemName: string;
  itemPrice: number;
  onSuccess?: () => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemName,
  itemPrice,
  onSuccess,
}: CheckoutDialogProps) {
  const { toast } = useToast();
  const { data: gateways, isLoading: loadingGateways } = useActivePaymentGateways();
  const [selectedGatewayId, setSelectedGatewayId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter out PIX manual gateways - only show stripe and asaas
  const filteredGateways = gateways?.filter(g => g.provider !== 'pix') || [];
  const selectedGateway = filteredGateways.find(g => g.id === selectedGatewayId);

  // Auto-select default gateway on load
  useEffect(() => {
    if (filteredGateways.length > 0 && !selectedGatewayId) {
      const defaultGateway = filteredGateways.find(g => g.is_default) || filteredGateways[0];
      setSelectedGatewayId(defaultGateway.id);
    }
  }, [filteredGateways, selectedGatewayId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsProcessing(false);
    }
  }, [open]);

  const handleConfirmPayment = async () => {
    if (!selectedGateway) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({
        title: 'Sessão expirada',
        description: 'Faça login novamente para continuar',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const functionName = itemType === 'plan' ? 'create-checkout' : 'create-module-checkout';
      const body = itemType === 'plan' 
        ? { planId: itemId, gateway: selectedGateway.provider }
        : { moduleId: itemId, gateway: selectedGateway.provider };

      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      });

      if (error) throw error;

      // Handle response - both Stripe and Asaas return a URL
      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
        onSuccess?.();
      } else {
        throw new Error('URL de pagamento não retornada');
      }
    } catch (error: any) {
      console.error('[CheckoutDialog] Error:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar Compra</DialogTitle>
          <DialogDescription>
            {itemName} - {formatCurrency(itemPrice)}
            {itemType === 'plan' && '/mês'}
          </DialogDescription>
        </DialogHeader>

        {loadingGateways ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredGateways.length > 0 ? (
          <PaymentMethodSelector
            gateways={filteredGateways}
            selectedGateway={selectedGatewayId}
            onSelect={setSelectedGatewayId}
            isLoading={isProcessing}
          />
        ) : (
          <p className="text-center text-muted-foreground py-4">
            Nenhuma forma de pagamento disponível.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmPayment}
            disabled={!selectedGatewayId || isProcessing || !filteredGateways.length}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Continuar para Pagamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
