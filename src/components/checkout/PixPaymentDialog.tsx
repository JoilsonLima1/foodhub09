import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PixPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pixKey: string;
  qrCodeUrl?: string;
  amount: number;
  itemName: string;
}

export function PixPaymentDialog({
  open,
  onOpenChange,
  pixKey,
  qrCodeUrl,
  amount,
  itemName,
}: PixPaymentDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      toast({ title: 'Chave PIX copiada!' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ 
        title: 'Erro ao copiar', 
        description: 'Copie manualmente a chave abaixo',
        variant: 'destructive' 
      });
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
          <DialogTitle>Pagamento via PIX</DialogTitle>
          <DialogDescription>
            {itemName} - {formatCurrency(amount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QR Code */}
          {qrCodeUrl && (
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg shadow-inner">
                <img src={qrCodeUrl} alt="QR Code PIX" className="w-48 h-48" />
              </div>
            </div>
          )}

          {/* Chave PIX */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Chave PIX:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-muted rounded-md text-sm break-all font-mono">
                {pixKey}
              </code>
              <Button size="icon" variant="outline" onClick={handleCopyPixKey}>
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Valor */}
          <div className="p-4 bg-primary/5 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Valor a pagar:</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(amount)}</p>
          </div>

          {/* Instruções */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Instruções:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Abra o app do seu banco</li>
              <li>Escaneie o QR Code ou copie a chave PIX</li>
              <li>Confirme o valor de {formatCurrency(amount)}</li>
              <li>Após o pagamento, sua ativação será processada em até 24h</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
