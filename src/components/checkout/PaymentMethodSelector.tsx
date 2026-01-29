import { forwardRef } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, Wallet } from 'lucide-react';
import type { PublicPaymentGateway } from '@/hooks/useActivePaymentGateways';

interface PaymentMethodSelectorProps {
  gateways: PublicPaymentGateway[];
  selectedGateway: string | null;
  onSelect: (gatewayId: string) => void;
  isLoading?: boolean;
}

const GATEWAY_ICONS: Record<string, typeof CreditCard> = {
  stripe: CreditCard,
  asaas: Wallet,
};

const GATEWAY_DESCRIPTIONS: Record<string, string> = {
  stripe: 'Cartão de crédito ou débito',
  asaas: 'Boleto, cartão ou PIX',
};

export const PaymentMethodSelector = forwardRef<HTMLDivElement, PaymentMethodSelectorProps>(
  function PaymentMethodSelector({ gateways, selectedGateway, onSelect, isLoading }, ref) {
    return (
      <div ref={ref} className="space-y-4">
        <Label className="text-base font-medium">Forma de Pagamento</Label>
        <RadioGroup 
          value={selectedGateway || ''} 
          onValueChange={onSelect}
          disabled={isLoading}
          className="space-y-3"
        >
          {gateways.map((gateway) => {
            const Icon = GATEWAY_ICONS[gateway.provider] || CreditCard;
            return (
              <div 
                key={gateway.id}
                className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <RadioGroupItem value={gateway.id} id={gateway.id} />
                <Label htmlFor={gateway.id} className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{gateway.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {GATEWAY_DESCRIPTIONS[gateway.provider] || 'Pagamento online'}
                    </p>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    );
  }
);
