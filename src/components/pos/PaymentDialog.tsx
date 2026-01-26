import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Banknote, QrCode } from 'lucide-react';
import type { PaymentMethod } from '@/types/database';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  onConfirm: () => void;
  formatCurrency: (value: number) => string;
  isProcessing?: boolean;
}

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  selectedMethod,
  onSelectMethod,
  onConfirm,
  formatCurrency,
  isProcessing = false,
}: PaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forma de Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center py-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Total a Pagar</p>
            <p className="text-3xl font-bold">{formatCurrency(total)}</p>
          </div>

          <Tabs defaultValue="common" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="common">Comum</TabsTrigger>
              <TabsTrigger value="card">Cartão</TabsTrigger>
            </TabsList>
            <TabsContent value="common" className="space-y-2">
              <Button
                variant={selectedMethod === 'cash' ? 'default' : 'outline'}
                className="w-full justify-start h-14"
                onClick={() => onSelectMethod('cash')}
                disabled={isProcessing}
              >
                <Banknote className="h-5 w-5 mr-3" />
                Dinheiro
              </Button>
              <Button
                variant={selectedMethod === 'pix' ? 'default' : 'outline'}
                className="w-full justify-start h-14"
                onClick={() => onSelectMethod('pix')}
                disabled={isProcessing}
              >
                <QrCode className="h-5 w-5 mr-3" />
                Pix
              </Button>
            </TabsContent>
            <TabsContent value="card" className="space-y-2">
              <Button
                variant={selectedMethod === 'credit_card' ? 'default' : 'outline'}
                className="w-full justify-start h-14"
                onClick={() => onSelectMethod('credit_card')}
                disabled={isProcessing}
              >
                <CreditCard className="h-5 w-5 mr-3" />
                Crédito
              </Button>
              <Button
                variant={selectedMethod === 'debit_card' ? 'default' : 'outline'}
                className="w-full justify-start h-14"
                onClick={() => onSelectMethod('debit_card')}
                disabled={isProcessing}
              >
                <CreditCard className="h-5 w-5 mr-3" />
                Débito
              </Button>
            </TabsContent>
          </Tabs>

          <Button
            className="w-full h-12"
            disabled={!selectedMethod || isProcessing}
            onClick={onConfirm}
          >
            {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
