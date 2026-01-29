import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Gift, Wallet } from 'lucide-react';

type SimpleModule = {
  id: string;
  name: string;
};

type PurchasedModule = {
  id: string;
  name: string;
  priceLabel?: string;
  metaLabel?: string;
};

interface PlanInclusionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  planName: string;
  planPriceLabel?: string;
  planFeatures: string[];
  includedModules: SimpleModule[];
  purchasedModules?: PurchasedModule[];
}

export function PlanInclusionsDialog({
  open,
  onOpenChange,
  title,
  description,
  planName,
  planPriceLabel,
  planFeatures,
  includedModules,
  purchasedModules,
}: PlanInclusionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm text-muted-foreground">Plano</p>
              <p className="text-lg font-semibold">{planName}</p>
            </div>
            {planPriceLabel && (
              <Badge variant="outline" className="text-sm">
                {planPriceLabel}
              </Badge>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">Recursos inclusos</h3>
                <Badge variant="secondary">{planFeatures.length}</Badge>
              </div>
              <Separator className="my-3" />
              {planFeatures.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum recurso listado.</p>
              ) : (
                <ul className="space-y-2">
                  {planFeatures.map((f, idx) => (
                    <li key={`${f}-${idx}`} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">Módulos incluídos (brinde)</h3>
                <Badge variant="secondary">{includedModules.length}</Badge>
              </div>
              <Separator className="my-3" />
              {includedModules.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum módulo incluso neste plano.</p>
              ) : (
                <ul className="space-y-2">
                  {includedModules.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Gift className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{m.name}</span>
                      </div>
                      <Badge variant="outline">Brinde</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {purchasedModules && purchasedModules.length > 0 && (
            <section className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">Seus módulos adquiridos</h3>
                <Badge variant="secondary">{purchasedModules.length}</Badge>
              </div>
              <Separator className="my-3" />
              <ul className="space-y-2">
                {purchasedModules.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{m.name}</span>
                        <Badge variant="outline">Adquirido</Badge>
                      </div>
                      {m.metaLabel && (
                        <p className="text-xs text-muted-foreground mt-1">{m.metaLabel}</p>
                      )}
                    </div>
                    {m.priceLabel && (
                      <Badge variant="secondary" className="shrink-0">
                        {m.priceLabel}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
