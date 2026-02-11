import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'printer_callout_dismissed';

export function DefaultPrinterCallout() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
      <div className="flex gap-2">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
          <p className="font-medium">💡 Dica: Defina sua impressora padrão</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>No Windows, vá em <strong>Configurações → Impressoras</strong> e defina a impressora térmica como padrão.</li>
            <li>No Chrome, ao imprimir pela primeira vez, selecione sua impressora e marque "Sempre usar".</li>
          </ol>
          <Button variant="ghost" size="sm" className="h-6 text-xs mt-1 text-amber-600 dark:text-amber-400" onClick={handleDismiss}>
            <X className="h-3 w-3 mr-1" /> Não mostrar novamente
          </Button>
        </div>
      </div>
    </div>
  );
}
