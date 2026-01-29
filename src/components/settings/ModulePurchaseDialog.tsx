import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Package, CreditCard, Info } from 'lucide-react';
import { useBillingSettings } from '@/hooks/useBillingSettings';
import { useTenantModules } from '@/hooks/useTenantModules';
import type { AddonModule } from '@/hooks/useAddonModules';
import { CheckoutDialog } from '@/components/checkout/CheckoutDialog';

interface ModulePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: AddonModule | null;
  onSuccess?: () => void;
}

export function ModulePurchaseDialog({
  open,
  onOpenChange,
  module,
  onSuccess,
}: ModulePurchaseDialogProps) {
  const { settings } = useBillingSettings();
  const { tenantInfo, getModulesBreakdown } = useTenantModules();
  const [showCheckout, setShowCheckout] = useState(false);

  const breakdown = getModulesBreakdown();
  const plan = tenantInfo?.subscription_plans as any;
  const billingMode = settings?.modules_billing_mode || 'bundle';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (!module) return null;

  const newTotal = breakdown.totalMonthly + module.monthly_price;

  const handleConfirm = () => {
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <>
      <Dialog open={open && !showCheckout} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Contratar Módulo
            </DialogTitle>
            <DialogDescription>
              Revise os detalhes antes de confirmar a contratação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Plan */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plano atual</p>
                  <p className="font-semibold">{plan?.name || 'Sem plano'}</p>
                </div>
                <span className="text-lg font-bold">
                  {formatPrice(breakdown.planPrice)}/mês
                </span>
              </div>
            </div>

            {/* Module to Purchase */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Módulo escolhido</p>
                  <p className="font-semibold">{module.name}</p>
                </div>
                <span className="text-lg font-bold text-primary">
                  + {formatPrice(module.monthly_price)}/mês
                </span>
              </div>
              {module.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {module.description}
                </p>
              )}
            </div>

            <Separator />

            {/* Billing Mode Info */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                {billingMode === 'bundle' ? (
                  <>
                    <p className="font-medium text-blue-700 dark:text-blue-400">
                      Cobrança unificada
                    </p>
                    <p className="text-blue-600 dark:text-blue-300">
                      O valor do módulo será somado à sua assinatura mensal. 
                      Você receberá uma única cobrança com detalhamento.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-blue-700 dark:text-blue-400">
                      Cobrança separada
                    </p>
                    <p className="text-blue-600 dark:text-blue-300">
                      Este módulo gerará uma cobrança separada do plano, 
                      com data de vencimento própria.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Total */}
            {billingMode === 'bundle' && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Novo valor mensal
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      Plano + Módulos
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {formatPrice(newTotal)}
                  </span>
                </div>
              </div>
            )}

            {/* Setup Fee Warning */}
            {module.setup_fee > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                <CreditCard className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Taxa de setup: <strong>{formatPrice(module.setup_fee)}</strong> (cobrança única)
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>
              <CreditCard className="h-4 w-4 mr-2" />
              Confirmar Contratação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      {module && (
        <CheckoutDialog
          open={showCheckout}
          onOpenChange={setShowCheckout}
          itemType="module"
          itemId={module.id}
          itemName={module.name}
          itemPrice={module.monthly_price}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </>
  );
}
