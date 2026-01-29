import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PixPaymentDialog } from './PixPaymentDialog';
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
  const [pixData, setPixData] = useState<{ pixKey: string; qrCode: string; amount: number } | null>(null);

  const selectedGateway = gateways?.find(g => g.id === selectedGatewayId);

  // Auto-select default gateway on load
  useEffect(() => {
    if (gateways && gateways.length > 0 && !selectedGatewayId) {
      const defaultGateway = gateways.find(g => g.is_default) || gateways[0];
      setSelectedGatewayId(defaultGateway.id);
    }
  }, [gateways, selectedGatewayId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPixData(null);
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

      // Handle response based on gateway
      switch (selectedGateway.provider) {
        case 'stripe':
        case 'asaas':
          if (data?.url) {
            window.open(data.url, '_blank');
            onOpenChange(false);
            onSuccess?.();
          } else {
            throw new Error('URL de pagamento não retornada');
          }
          break;
        case 'pix':
          if (data?.pix_key) {
            setPixData({
              pixKey: data.pix_key,
              qrCode: data.qr_code || '',
              amount: data.amount || itemPrice,
            });
          } else {
            throw new Error('Dados do PIX não retornados');
          }
          break;
        default:
          throw new Error('Gateway não suportado');
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

  // Show PIX dialog if PIX data is available
  if (pixData) {
    return (
      <PixPaymentDialog
        open={true}
        onOpenChange={() => {
          setPixData(null);
          onOpenChange(false);
          onSuccess?.();
        }}
        pixKey={pixData.pixKey}
        qrCodeUrl={pixData.qrCode}
        amount={pixData.amount}
        itemName={itemName}
      />
    );
  }

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
        ) : gateways && gateways.length > 0 ? (
          <PaymentMethodSelector
            gateways={gateways}
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
            disabled={!selectedGatewayId || isProcessing || !gateways?.length}
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
