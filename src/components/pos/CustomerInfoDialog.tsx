import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { User, FileText, ArrowRight } from 'lucide-react';

interface CustomerInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onContinue: () => void;
  formatCurrency: (value: number) => string;
  total: number;
}

export function CustomerInfoDialog({
  open,
  onOpenChange,
  customerName,
  onCustomerNameChange,
  notes,
  onNotesChange,
  onContinue,
  formatCurrency,
  total,
}: CustomerInfoDialogProps) {
  const handleContinue = () => {
    onContinue();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Pedido
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center py-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Total do Pedido</p>
            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome do Cliente (opcional)
            </Label>
            <Input
              id="customerName"
              placeholder="Ex: João Silva"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Ex: Sem cebola, entregar no balcão..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <Button className="w-full h-12" onClick={handleContinue}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Continuar para Pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
