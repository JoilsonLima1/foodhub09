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

function getErrorGuidance(code?: string): string {
  switch (code) {
    case "NO_DEFAULT_PRINTER":
      return "Defina uma impressora padrão no Windows.";
    case "PRINTER_NOT_FOUND":
      return "A impressora padrão não foi encontrada. Verifique se está ligada.";
    case "PRINT_FAILED":
      return "Falha ao imprimir diretamente. Verifique o app desktop e a impressora.";
    case "DIALOG_OPENED_INSTEAD_OF_SILENT":
      return "O app desktop ainda está abrindo a tela de impressão em vez de imprimir silenciosamente.";
    default:
      return "Verifique a configuração da impressora padrão e do app desktop.";
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

  const handleDesktopPrint = async () => {
    if (!window.foodhub?.printReceipt) {
      setShowDesktopFallback(true);
      toast({
        title: "Impressão direta indisponível",
        description: "O app desktop não foi detectado. Para imprimir em 1 clique, abra no FoodHub PDV Desktop.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    const pw = Number(settings?.paper_width) === 58 ? 58 : 80;
    const receiptLines = buildReceiptLines();

    const result = await window.foodhub.printReceipt({
      lines: receiptLines,
      printerName: null,
      paperWidth: pw,
      silent: true,
      useDefaultPrinter: true,
    });

    if (result.ok) {
      toast({
        title: "✅ Impresso com sucesso",
        description: "Cupom enviado direto para a impressora padrão.",
        duration: 4000,
      });
      onOpenChange(false);
      return;
    }

    const errCode = result.error?.code || "UNKNOWN";
    const errMsg = result.error?.message || "Falha ao imprimir.";

    toast({
      title: `❌ Falha ao imprimir (${errCode})`,
      description: `${errMsg}\n${getErrorGuidance(errCode)}`,
      variant: "destructive",
      duration: 12000,
    });
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
      toast({
        title: "Erro ao enfileirar impressão",
        description: "Não foi possível enviar para a maquininha.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "📱 Enviado para SmartPOS",
      description: "O cupom será impresso em instantes.",
      duration: 4000,
    });

    onOpenChange(false);
  };

  const handleBrowserPrint = () => {
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

    printReceiptHTML(html, paperWidth);
  };

  const handlePrint = async () => {
    if (isPrinting) return;

    setIsPrinting(true);
    setShowDesktopFallback(false);

    try {
      if (settings?.print_mode === "smartpos") {
        await handleSmartPosPrint();
        return;
      }

      if (settings?.print_mode === "desktop") {
        if (window.foodhub?.printReceipt) {
          await handleDesktopPrint();
          return;
        }

        setShowDesktopFallback(true);
        toast({
          title: "Impressão direta indisponível",
          description: "O app desktop não foi detectado. Instale ou abra o FoodHub PDV Desktop.",
          variant: "destructive",
          duration: 10000,
        });
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
            results.push(`Impressoras encontradas: ${status.printersCount}`);
            results.push(`Impressora padrão: ${status.defaultPrinterName || "Nenhuma"}`);
          } catch {
            results.push("Status: ❌ Erro ao consultar");
          }
        }

        if (window.foodhub.getDefaultPrinter) {
          try {
            const defaultPrinter = await window.foodhub.getDefaultPrinter();
            results.push(`Padrão do sistema: ${defaultPrinter || "Nenhuma"}`);
          } catch {
            results.push("Padrão do sistema: ❌ Erro ao consultar");
          }
        }
      } else {
        results.push("Desktop PDV: ❌ Não detectado");
      }

      toast({
        title: "🔍 Diagnóstico de Impressão",
        description: results.join("\n"),
        duration: 15000,
      });
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
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">⚠️ App Desktop não detectado</p>

            <p className="text-xs text-muted-foreground">
              Impressão em 1 clique sem seleção só funciona no app Desktop usando a impressora padrão.
            </p>

            <div className="flex flex-col gap-2">
              {desktopUrls?.windows_url && desktopUrls.windows_url !== "#" ? (
                <Button type="button" size="sm" onClick={() => window.open(desktopUrls.windows_url, "_blank")}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar app Desktop
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={() => window.open("/downloads", "_blank")}>
                  <Download className="h-4 w-4 mr-2" />
                  Ver página de download
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>

          <Button type="button" className="flex-1" onClick={handlePrint} disabled={isPrinting}>
            {isPrinting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            {isPrinting ? "Imprimindo..." : isDesktopDirectPrintAvailable ? "Imprimir direto" : "Imprimir"}
          </Button>
        </div>

        {settings?.print_mode === "desktop" && (
          <Button
            type="button"
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
