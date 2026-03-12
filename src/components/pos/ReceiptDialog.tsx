import { useRef, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, CheckCircle, Loader2, Stethoscope, Download } from "lucide-react";
import { ReceiptPrint } from "./ReceiptPrint";
import type { CartItem } from "@/types/database";
import { getPrinterConfig } from "@/components/settings/PrinterSettings";
import { printReceiptHTML, buildReceiptHTML, type PaperWidthMM } from "@/lib/thermalPrint";
import { useTenantPrintSettings } from "@/hooks/useTenantPrintSettings";
import { useDesktopPdvSettings } from "@/hooks/useDesktopPdvSettings";
import { usePrinterRoutes } from "@/hooks/usePrinterRoutes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const paymentMethodLabels: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  voucher: "Voucher",
  mixed: "Misto",
};

interface ReceiptLine {
  type: "text" | "bold" | "separator" | "cut" | "feed" | "pair";
  value?: string;
  align?: "left" | "center" | "right";
  left?: string;
  right?: string;
  lines?: number;
}

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: number;
  items: CartItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  cashierName: string;
  tenantName?: string;
  tenantLogo?: string | null;
}

/**
 * Tipagem mínima da bridge desktop
 * Ajuste conforme sua implementação real do Electron preload
 */
declare global {
  interface Window {
    foodhub?: {
      printReceipt?: (payload: { lines: ReceiptLine[]; printerName: string | null; paperWidth: 58 | 80 }) => Promise<{
        ok: boolean;
        jobId?: string;
        error?: {
          code?: string;
          message?: string;
        };
      }>;
      getPrinters?: () => Promise<string[]>;
      getDefaultPrinter?: () => Promise<string | null>;
      getStatus?: () => Promise<{
        appVersion: string;
        printersCount: number;
        defaultPrinterName?: string | null;
      }>;
    };
  }
}

/** Map error codes to user-friendly guidance */
function getErrorGuidance(code?: string): string {
  switch (code) {
    case "PRINTER_NOT_CONFIGURED":
      return "Adicione uma impressora ao setor Caixa nas configurações.";
    case "PRINTER_NOT_FOUND":
      return "Verifique se a impressora está ligada e conectada ao computador.";
    case "NO_DRIVER_SET":
      return "Instale/configure corretamente a impressora no sistema operacional.";
    case "PRINT_FAILED":
      return "Tente reimprimir. Se persistir, verifique a conexão da impressora.";
    case "NO_PRINTERS_AVAILABLE":
      return "Nenhuma impressora foi encontrada no computador.";
    default:
      return "Verifique a impressora e tente novamente.";
  }
}

export function ReceiptDialog({
  open,
  onOpenChange,
  orderNumber,
  items,
  subtotal,
  total,
  paymentMethod,
  cashierName,
  tenantName = "FoodHub09",
  tenantLogo,
}: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings } = useTenantPrintSettings();
  const { data: desktopUrls } = useDesktopPdvSettings();
  const { routes } = usePrinterRoutes();
  const { tenantId, user } = useAuth();
  const { toast } = useToast();

  const [isPrinting, setIsPrinting] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [showDesktopFallback, setShowDesktopFallback] = useState(false);

  useEffect(() => {
    if (open) {
      const config = getPrinterConfig();
      document.documentElement.style.setProperty("--receipt-width", config.paperWidth);
    }
  }, [open]);

  const findCaixaRoute = () => {
    return routes.find((r) => r.route_key === "caixa") || null;
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const buildReceiptLines = (): ReceiptLine[] => {
    const now = new Date();
    const date = now.toLocaleDateString("pt-BR");
    const time = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const lines: ReceiptLine[] = [
      { type: "bold", value: tenantName, align: "center" },
      { type: "separator" },
      { type: "bold", value: `PEDIDO #${orderNumber}`, align: "center" },
      { type: "pair", left: "Data:", right: `${date} ${time}` },
      { type: "pair", left: "Caixa:", right: cashierName },
      { type: "separator" },
    ];

    items.forEach((item, i) => {
      const name = item.variationName ? `${item.productName} (${item.variationName})` : item.productName;

      lines.push({ type: "text", value: `${i + 1}. ${name}` });
      lines.push({
        type: "pair",
        left: `   ${item.quantity}x ${formatCurrency(item.unitPrice)}`,
        right: formatCurrency(item.totalPrice),
      });

      if (item.notes) {
        lines.push({ type: "text", value: `   Obs: ${item.notes}` });
      }
    });

    lines.push({ type: "separator" });
    lines.push({
      type: "pair",
      left: "Subtotal:",
      right: formatCurrency(subtotal),
    });
    lines.push({
      type: "bold",
      value: `TOTAL: ${formatCurrency(total)}`,
      align: "right",
    });
    lines.push({
      type: "pair",
      left: "Pagamento:",
      right: paymentMethodLabels[paymentMethod] || paymentMethod,
    });
    lines.push({ type: "separator" });
    lines.push({
      type: "text",
      value: "Obrigado pela preferência!",
      align: "center",
    });
    lines.push({ type: "feed", lines: 3 });
    lines.push({ type: "cut" });

    return lines;
  };

  const buildBrowserReceiptHtml = () => {
    const config = getPrinterConfig();
    const paperWidth = config.paperWidth.replace("mm", "") as PaperWidthMM;

    const html = buildReceiptHTML({
      tenantName,
      tenantLogo,
      orderNumber,
      dateStr: new Date().toLocaleDateString("pt-BR"),
      timeStr: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      cashierName,
      items: items.map((item, index) => ({
        index: index + 1,
        name: item.productName,
        variationName: item.variationName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes,
      })),
      subtotal,
      total,
      paymentMethodLabel: paymentMethodLabels[paymentMethod] || paymentMethod,
    });

    return { html, paperWidth };
  };

  /**
   * Regra:
   * 1) Se houver impressoras configuradas na rota caixa, usa somente as que estiverem conectadas
   * 2) Se não houver nenhuma configurada/compatível, usa todas as impressoras conectadas
   * 3) Se ainda assim não houver nenhuma listada, usa null => impressora padrão do SO
   */
  const resolveDesktopPrinters = async (): Promise<(string | null)[]> => {
    const caixaRoute = findCaixaRoute();
    const routePrinters = caixaRoute?.printers?.filter(Boolean) || [];

    let connectedPrinters: string[] = [];
    try {
      connectedPrinters = (await window.foodhub?.getPrinters?.()) || [];
    } catch (error) {
      console.warn("[PRINT] erro ao listar impressoras conectadas:", error);
    }

    console.log("[PRINT] routePrinters:", routePrinters);
    console.log("[PRINT] connectedPrinters:", connectedPrinters);

    if (connectedPrinters.length === 0) {
      return [null];
    }

    if (routePrinters.length > 0) {
      const matched = routePrinters.filter((rp) =>
        connectedPrinters.some((cp) => cp.trim().toLowerCase() === rp.trim().toLowerCase()),
      );

      if (matched.length > 0) {
        return matched;
      }
    }

    return connectedPrinters;
  };

  const handleDesktopPrint = async () => {
    if (!window.foodhub?.printReceipt) {
      setShowDesktopFallback(true);
      return;
    }

    const caixaRoute = findCaixaRoute();
    const pw = Number(caixaRoute?.paper_width || settings?.paper_width) === 58 ? 58 : 80;
    const receiptLines = buildReceiptLines();

    const printers = await resolveDesktopPrinters();

    console.log("[PRINT][DESKTOP] resolvedPrinters:", printers, "paperWidth:", pw);

    if (printers.length === 0) {
      toast({
        title: "Nenhuma impressora disponível",
        description: getErrorGuidance("NO_PRINTERS_AVAILABLE"),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "🖨️ Enviando impressão...",
      description:
        printers[0] === null
          ? "Usando a impressora padrão do sistema"
          : `Enviando para ${printers.length} impressora(s) detectada(s)`,
    });

    const successPrinters: string[] = [];
    const failedPrinters: string[] = [];

    for (const printerName of printers) {
      const result = await window.foodhub.printReceipt({
        lines: receiptLines,
        printerName,
        paperWidth: pw,
      });

      console.log("[PRINT][DESKTOP] result:", {
        printerName,
        ok: result.ok,
        jobId: result.jobId,
        error: result.error,
      });

      if (result.ok) {
        successPrinters.push(printerName || "Padrão do sistema");
      } else {
        failedPrinters.push(printerName || "Padrão do sistema");

        const errCode = result.error?.code || "UNKNOWN";
        const errMsg = result.error?.message || "Falha ao imprimir.";

        toast({
          title: `❌ Falha ao imprimir (${errCode})`,
          description: `${printerName || "Impressora padrão"}: ${errMsg}\n${getErrorGuidance(errCode)}`,
          variant: "destructive",
          duration: 10000,
        });
      }
    }

    if (successPrinters.length > 0) {
      toast({
        title: "✅ Impressão concluída",
        description:
          successPrinters.length === 1
            ? `Impresso em: ${successPrinters[0]}`
            : `Impresso em ${successPrinters.length} impressoras`,
        duration: 5000,
      });
    }

    if (successPrinters.length === 0 && failedPrinters.length > 0) {
      toast({
        title: "Nenhuma impressão foi concluída",
        description: "Todas as tentativas falharam.",
        variant: "destructive",
      });
    }
  };

  const handleSmartPosPrint = async () => {
    if (!tenantId) {
      toast({
        title: "Tenant não identificado",
        description: "Não foi possível enfileirar a impressão.",
        variant: "destructive",
      });
      return;
    }

    const receiptLines = buildReceiptLines();

    const payload = {
      version: 1,
      title: tenantName,
      job_type: "RECEIPT" as const,
      order_id: String(orderNumber),
      target: { sector: "caixa" },
      lines: receiptLines.map((l) => {
        if (l.type === "separator") return { type: "hr" };
        if (l.type === "bold") {
          return {
            type: "text",
            value: l.value || "",
            align: l.align || "left",
            bold: true,
          };
        }
        if (l.type === "pair") {
          return {
            type: "pair",
            left: l.left || "",
            right: l.right || "",
            bold: false,
          };
        }
        if (l.type === "cut") return { type: "cut" };
        if (l.type === "feed") return { type: "text", value: "" };

        return {
          type: "text",
          value: l.value || "",
          align: l.align || "left",
          bold: false,
        };
      }),
    };

    const { error: jobError } = await supabase.from("print_jobs").insert({
      tenant_id: tenantId,
      device_id: null,
      source: "pdv",
      job_type: "RECEIPT",
      payload,
      priority: 3,
      created_by_user_id: user?.id || null,
    });

    if (jobError) {
      console.error("Failed to create print job:", jobError);
      toast({
        title: "Erro ao enfileirar impressão",
        description: "Não foi possível enviar para a maquininha.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "📱 Enviado para SmartPOS",
      description: "O cupom será impresso pela maquininha em instantes.",
      duration: 4000,
    });
  };

  const handleBrowserPrint = () => {
    console.log("[PRINT][WEB] Usando impressão do navegador");
    const { html, paperWidth } = buildBrowserReceiptHtml();
    printReceiptHTML(html, paperWidth);
  };

  const handlePrint = async () => {
    console.log("[PRINT] click imprimir", {
      mode: settings?.print_mode,
      hasBridge: !!window.foodhub,
      hasPrintReceipt: !!window.foodhub?.printReceipt,
    });

    setIsPrinting(true);

    try {
      if (settings?.print_mode === "desktop") {
        await handleDesktopPrint();
        return;
      }

      if (settings?.print_mode === "smartpos") {
        await handleSmartPosPrint();
        return;
      }

      handleBrowserPrint();
    } catch (error) {
      console.error("[PRINT] erro geral:", error);
      toast({
        title: "Erro ao imprimir",
        description: "Ocorreu um erro inesperado ao processar a impressão.",
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDiagnostic = async () => {
    setIsDiagnosing(true);
    const results: string[] = [];

    try {
      results.push(`Modo atual: ${settings?.print_mode || "web"}`);

      if (window.foodhub) {
        results.push("Desktop PDV: ✅ Conectado");

        if (window.foodhub.getStatus) {
          try {
            const status = await window.foodhub.getStatus();
            results.push(`Versão: ${status.appVersion}`);
            results.push(`Impressoras: ${status.printersCount} encontrada(s)`);
            results.push(`Padrão: ${status.defaultPrinterName || "Nenhuma"}`);
          } catch {
            results.push("Status: ❌ Erro ao consultar");
          }
        }

        if (window.foodhub.getPrinters) {
          try {
            const printers = await window.foodhub.getPrinters();
            results.push(`Conectadas: ${printers.length > 0 ? printers.join(", ") : "Nenhuma"}`);
          } catch {
            results.push("Conectadas: ❌ Erro ao listar");
          }
        }

        if (window.foodhub.getDefaultPrinter) {
          try {
            const defaultPrinter = await window.foodhub.getDefaultPrinter();
            results.push(`Padrão SO: ${defaultPrinter || "Nenhuma definida"}`);
          } catch {
            results.push("Padrão SO: ❌ Erro ao consultar");
          }
        }
      } else {
        results.push("Desktop PDV: ❌ Não está rodando no FoodHub PDV Desktop");
        results.push("💡 Baixe o FoodHub PDV Desktop para impressão direta.");
      }

      const caixaRoute = findCaixaRoute();
      if (caixaRoute) {
        results.push(
          `Rota Caixa: route_key="${caixaRoute.route_key}", printers=[${caixaRoute.printers.join(", ") || "(nenhuma configurada)"}]`,
        );
      } else {
        results.push("Rota Caixa: ❌ Não encontrada");
      }

      toast({
        title: "🔍 Diagnóstico de Impressão",
        description: results.join("\n"),
        duration: 15000,
      });

      console.log("[DIAG]", results);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const isDesktopDirectPrintAvailable = settings?.print_mode === "desktop" && !!window.foodhub?.printReceipt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Pedido #{orderNumber} Concluído!
          </DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden bg-muted/50">
          <ReceiptPrint
            ref={receiptRef}
            orderNumber={orderNumber}
            items={items}
            subtotal={subtotal}
            total={total}
            paymentMethod={paymentMethod}
            cashierName={cashierName}
            tenantName={tenantName}
            tenantLogo={tenantLogo}
          />
        </div>

        {showDesktopFallback && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              ⚠️ FoodHub PDV Desktop não detectado
            </p>

            <p className="text-xs text-muted-foreground">
              Para impressão direta sem tela do navegador, abra o sistema pelo app Desktop. No navegador, a impressão
              abrirá o diálogo de impressão.
            </p>

            <div className="flex flex-col gap-2">
              {desktopUrls?.windows_url && desktopUrls.windows_url !== "#" ? (
                <Button size="sm" onClick={() => window.open(desktopUrls.windows_url, "_blank")}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar FoodHub PDV Desktop
                </Button>
              ) : (
                <Button size="sm" onClick={() => window.open("/downloads", "_blank")}>
                  <Download className="h-4 w-4 mr-2" />
                  Ver página de download
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDesktopFallback(false);
                  handleBrowserPrint();
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir pelo navegador
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>

          <Button className="flex-1" onClick={handlePrint} disabled={isPrinting}>
            {isPrinting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}

            {isPrinting ? "Imprimindo..." : isDesktopDirectPrintAvailable ? "Imprimir direto" : "Imprimir"}
          </Button>
        </div>

        {settings?.print_mode === "desktop" && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={handleDiagnostic}
            disabled={isDiagnosing}
          >
            {isDiagnosing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Stethoscope className="h-3 w-3 mr-1" />
            )}
            {window.foodhub ? "Diagnóstico da Impressora" : "Verificar Ambiente Desktop"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
