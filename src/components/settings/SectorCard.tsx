import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Printer, Plus, Trash2, TestTube, Loader2, X } from 'lucide-react';
import type { PrinterRoute } from '@/hooks/usePrinterRoutes';

interface SectorCardProps {
  route: PrinterRoute;
  printMode: string;
  hasDesktopBridge: boolean;
  detectedPrinters: string[];
  defaultPrinter: string | null;
  testingType: string | null;
  onAddPrinter: (printerName: string) => void;
  onRemovePrinter: (printerName: string) => void;
  onTestPrint: (printerName: string | null) => void;
  onRemoveRoute: () => void;
  routesSaving: boolean;
}

export function SectorCard({
  route,
  printMode,
  hasDesktopBridge,
  detectedPrinters,
  defaultPrinter,
  testingType,
  onAddPrinter,
  onRemovePrinter,
  onTestPrint,
  onRemoveRoute,
  routesSaving,
}: SectorCardProps) {
  const [addingPrinter, setAddingPrinter] = useState(false);
  const isDesktop = printMode === 'desktop';

  // Available printers not yet assigned to this sector
  const availablePrinters = detectedPrinters.filter(p => !route.printers.includes(p));

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Sector header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          {route.is_base && <Shield className="h-3.5 w-3.5 text-primary shrink-0" />}
          <span className="font-medium text-sm">{route.label}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
            {route.route_key}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isDesktop && hasDesktopBridge && route.printers.length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onTestPrint(null)}
              disabled={testingType !== null}
            >
              {testingType === route.id
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <TestTube className="h-3 w-3" />}
            </Button>
          )}
          {!route.is_base && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={onRemoveRoute}
              disabled={routesSaving}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Printer list */}
      <div className="px-3 py-2 space-y-1.5">
        {route.printers.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">
            {isDesktop
              ? 'Nenhuma impressora vinculada — usará a padrão do sistema.'
              : 'Impressora: padrão do sistema (diálogo do navegador).'}
          </p>
        ) : (
          route.printers.map((printer) => (
            <div key={printer} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-muted/40 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Printer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{printer}</span>
                {!detectedPrinters.includes(printer) && isDesktop && detectedPrinters.length > 0 && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">⚠️ não detectada</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isDesktop && hasDesktopBridge && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onTestPrint(printer)}
                    disabled={testingType !== null}
                  >
                    {testingType === route.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <TestTube className="h-3 w-3" />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => onRemovePrinter(printer)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}

        {/* Add printer action */}
        {isDesktop && detectedPrinters.length > 0 && (
          <>
            {addingPrinter ? (
              <div className="flex items-center gap-2 pt-1">
                <Select onValueChange={(v) => { onAddPrinter(v); setAddingPrinter(false); }}>
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Selecione uma impressora" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrinters.length === 0 ? (
                      <SelectItem value="__none__" disabled>Todas já vinculadas</SelectItem>
                    ) : (
                      availablePrinters.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-7" onClick={() => setAddingPrinter(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={() => setAddingPrinter(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar impressora
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
