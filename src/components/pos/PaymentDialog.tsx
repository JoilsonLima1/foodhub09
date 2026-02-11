import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Banknote, QrCode, FileText, Loader2, CheckCircle, ExternalLink, Copy, X, Wifi, WifiOff, AlertCircle, Zap } from 'lucide-react';
import type { PaymentMethod } from '@/types/database';
import type { POSPaymentIntent, POSBillingType, POSGatewayError } from '@/hooks/usePOSPayment';
import type { PixRapidoOption, PixRapidoIntent } from '@/hooks/usePixRapido';
import { toast } from '@/hooks/use-toast';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  onConfirm: () => void;
  formatCurrency: (value: number) => string;
  isProcessing?: boolean;
  onCreateOnlinePayment?: (billingType: POSBillingType, customerCpfCnpj?: string) => Promise<void>;
  paymentIntent?: POSPaymentIntent | null;
  paymentConfirmed?: boolean;
  isCreatingOnline?: boolean;
  isPolling?: boolean;
  onCancelOnlinePayment?: () => void;
  onResetOnlinePayment?: () => void;
  onFallbackToManual?: (method: PaymentMethod) => void;
  gatewayError?: POSGatewayError | null;
  // PIX Rápido props
  pixRapidoOptions?: PixRapidoOption[];
  pixRapidoIntent?: PixRapidoIntent | null;
  pixRapidoConfirmed?: boolean;
  isCreatingPixRapido?: boolean;
  isPollingPixRapido?: boolean;
  onLoadPixRapidoOptions?: () => void;
  isLoadingPixRapidoOptions?: boolean;
  onCreatePixRapido?: (pspProviderId: string) => Promise<void>;
  onResetPixRapido?: () => void;
  estimatePixRapidoFee?: (amount: number, option: PixRapidoOption) => number;
  pixRapidoError?: string | null;
}

type CpfPromptTarget = 'PIX' | 'BOLETO' | null;

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  selectedMethod,
  onSelectMethod,
  onConfirm,
  formatCurrency,
  isProcessing = false,
  onCreateOnlinePayment,
  paymentIntent,
  paymentConfirmed = false,
  isCreatingOnline = false,
  isPolling = false,
  onCancelOnlinePayment,
  onResetOnlinePayment,
  onFallbackToManual,
  gatewayError,
  pixRapidoOptions = [],
  pixRapidoIntent,
  pixRapidoConfirmed = false,
  isCreatingPixRapido = false,
  isPollingPixRapido = false,
  onLoadPixRapidoOptions,
  isLoadingPixRapidoOptions = false,
  onCreatePixRapido,
  onResetPixRapido,
  estimatePixRapidoFee,
  pixRapidoError,
}: PaymentDialogProps) {
  const [activeTab, setActiveTab] = useState<string>('online');
  const [cpfPromptTarget, setCpfPromptTarget] = useState<CpfPromptTarget>(null);
  const [cpfInput, setCpfInput] = useState('');
  const hasOnlineSupport = !!onCreateOnlinePayment;
  const hasPixRapido = !!onCreatePixRapido;

  // Load PIX Rápido options when tab is selected
  useEffect(() => {
    if (activeTab === 'pix-rapido' && onLoadPixRapidoOptions && pixRapidoOptions.length === 0) {
      onLoadPixRapidoOptions();
    }
  }, [activeTab, onLoadPixRapidoOptions, pixRapidoOptions.length]);

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 11) {
      return digits.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (_, a, b, c, d) =>
        [a, b, c].filter(Boolean).join('.') + (d ? `-${d}` : '')
      );
    }
    return digits.replace(/(\d{2})(\d{3})?(\d{3})?(\d{4})?(\d{2})?/, (_, a, b, c, d, e) =>
      [a, b, c].filter(Boolean).join('.') + (d ? `/${d}` : '') + (e ? `-${e}` : '')
    );
  };

  const cpfDigits = cpfInput.replace(/\D/g, '');
  const isCpfValid = cpfDigits.length === 11 || cpfDigits.length === 14;

  const handleOnlineMethodClick = (billingType: POSBillingType) => {
    if (billingType === 'CREDIT_CARD') {
      // Credit card doesn't require CPF
      onCreateOnlinePayment?.(billingType);
    } else {
      // PIX and Boleto require CPF - show prompt
      setCpfPromptTarget(billingType);
      setCpfInput('');
    }
  };

  const handleCpfConfirm = () => {
    if (cpfPromptTarget && isCpfValid) {
      onCreateOnlinePayment?.(cpfPromptTarget, cpfDigits);
      setCpfPromptTarget(null);
      setCpfInput('');
    }
  };

  const handleFallbackToManual = () => {
    const manualMethod: PaymentMethod = cpfPromptTarget === 'PIX' ? 'pix' : 'voucher';
    setCpfPromptTarget(null);
    setCpfInput('');
    setActiveTab('manual');
    onSelectMethod(manualMethod);
    onFallbackToManual?.(manualMethod);
  };

  const handleCopyPixCode = async () => {
    if (paymentIntent?.pixQrCode) {
      try {
        await navigator.clipboard.writeText(paymentIntent.pixQrCode);
        toast({ title: 'Código PIX copiado!' });
      } catch {
        toast({ title: 'Erro ao copiar', variant: 'destructive' });
      }
    }
  };

  const handleOpenInvoice = () => {
    if (paymentIntent?.invoiceUrl) {
      window.open(paymentIntent.invoiceUrl, '_blank');
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      if (paymentIntent && !paymentConfirmed) {
        onCancelOnlinePayment?.();
      }
      onResetOnlinePayment?.();
      onResetPixRapido?.();
      setCpfPromptTarget(null);
      setCpfInput('');
    }
    onOpenChange(open);
  };

  const handleCopyPixRapidoCode = async () => {
    if (pixRapidoIntent?.qr_code) {
      try {
        await navigator.clipboard.writeText(pixRapidoIntent.qr_code);
        toast({ title: 'Código PIX copiado!' });
      } catch {
        toast({ title: 'Erro ao copiar', variant: 'destructive' });
      }
    }
  };

  const isAnyConfirmed = paymentConfirmed || pixRapidoConfirmed;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Forma de Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Total */}
          <div className="text-center py-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Total a Pagar</p>
            <p className="text-3xl font-bold">{formatCurrency(total)}</p>
          </div>

          {/* Payment confirmed state (online or PIX Rápido) */}
          {isAnyConfirmed && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="h-16 w-16 text-primary" />
              <p className="text-xl font-bold text-primary">Pagamento Confirmado!</p>
              <p className="text-sm text-muted-foreground">O pagamento foi recebido com sucesso.</p>
              <Button className="w-full mt-2" onClick={onConfirm}>
                Finalizar Pedido
              </Button>
            </div>
          )}

          {/* CPF Prompt Modal (inline) */}
          {cpfPromptTarget && !isAnyConfirmed && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">
                    CPF/CNPJ necessário para {cpfPromptTarget === 'PIX' ? 'PIX Online' : 'Boleto'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O gateway de pagamento exige CPF ou CNPJ do pagador.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cpf-prompt" className="text-sm font-medium">
                  CPF/CNPJ do pagador
                </Label>
                <Input
                  id="cpf-prompt"
                  placeholder="000.000.000-00"
                  value={cpfInput}
                  onChange={(e) => setCpfInput(formatCpfCnpj(e.target.value))}
                  className="font-mono"
                  autoFocus
                />
                {cpfInput && !isCpfValid && (
                  <p className="text-xs text-destructive">CPF (11 dígitos) ou CNPJ (14 dígitos)</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!isCpfValid}
                  onClick={handleCpfConfirm}
                >
                  Confirmar e Gerar {cpfPromptTarget === 'PIX' ? 'PIX' : 'Boleto'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleFallbackToManual}
                >
                  <WifiOff className="h-3.5 w-3.5 mr-1.5" />
                  Usar {cpfPromptTarget === 'PIX' ? 'PIX Manual' : 'Pagamento Manual'}
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => { setCpfPromptTarget(null); setCpfInput(''); }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Payment flow (only show when not confirmed and no CPF prompt) */}
          {!isAnyConfirmed && !cpfPromptTarget && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${hasOnlineSupport && hasPixRapido ? 'grid-cols-3' : hasOnlineSupport || hasPixRapido ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {hasOnlineSupport && (
                  <TabsTrigger value="online" className="gap-1">
                    <Wifi className="h-3.5 w-3.5" />
                    Online
                  </TabsTrigger>
                )}
                {hasPixRapido && (
                  <TabsTrigger value="pix-rapido" className="gap-1">
                    <Zap className="h-3.5 w-3.5" />
                    PIX Rápido
                  </TabsTrigger>
                )}
                <TabsTrigger value="manual" className="gap-1">
                  <WifiOff className="h-3.5 w-3.5" />
                  Manual
                </TabsTrigger>
              </TabsList>

              {/* ====== ONLINE PAYMENT TAB ====== */}
              {hasOnlineSupport && (
                <TabsContent value="online" className="space-y-3 mt-3">
                  {/* Billing type selection */}
                  {!paymentIntent && !isCreatingOnline && !gatewayError && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Selecione o meio de pagamento online:</p>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-14"
                        onClick={() => handleOnlineMethodClick('PIX')}
                        disabled={isCreatingOnline}
                      >
                        <QrCode className="h-5 w-5 mr-3 text-green-600" />
                        <div className="text-left">
                          <p className="font-medium">PIX</p>
                          <p className="text-xs text-muted-foreground">QR Code instantâneo</p>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-14"
                        onClick={() => handleOnlineMethodClick('CREDIT_CARD')}
                        disabled={isCreatingOnline}
                      >
                        <CreditCard className="h-5 w-5 mr-3 text-blue-600" />
                        <div className="text-left">
                          <p className="font-medium">Cartão de Crédito</p>
                          <p className="text-xs text-muted-foreground">Link de pagamento</p>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-14"
                        onClick={() => handleOnlineMethodClick('BOLETO')}
                        disabled={isCreatingOnline}
                      >
                        <FileText className="h-5 w-5 mr-3 text-orange-600" />
                        <div className="text-left">
                          <p className="font-medium">Boleto</p>
                          <p className="text-xs text-muted-foreground">Gerar boleto bancário</p>
                        </div>
                      </Button>
                    </div>
                  )}

                  {/* Loading state */}
                  {isCreatingOnline && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Gerando cobrança...</p>
                    </div>
                  )}

                  {/* Gateway error with fallback actions */}
                  {gatewayError && !paymentIntent && !isCreatingOnline && (
                    <div className="space-y-3 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Erro no pagamento online</p>
                          <p className="text-xs text-muted-foreground mt-1">{gatewayError.message}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => {
                            const methodMap: Record<string, PaymentMethod> = {
                              pix: 'pix',
                              credit_card: 'credit_card',
                              cash: 'cash',
                              pix_external: 'pix',
                              card_external: 'credit_card',
                            };
                            const method = methodMap[gatewayError.suggestedManualMethod] || 'cash';
                            setActiveTab('manual');
                            onSelectMethod(method);
                            onResetOnlinePayment?.();
                            onFallbackToManual?.(method);
                          }}
                        >
                          <WifiOff className="h-4 w-4 mr-2" />
                          Usar pagamento manual
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => onResetOnlinePayment?.()}
                        >
                          Tentar novamente
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Payment intent created - show details */}
                  {paymentIntent && !isCreatingOnline && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="gap-1">
                          {paymentIntent.billingType === 'PIX' && <QrCode className="h-3 w-3" />}
                          {paymentIntent.billingType === 'CREDIT_CARD' && <CreditCard className="h-3 w-3" />}
                          {paymentIntent.billingType === 'BOLETO' && <FileText className="h-3 w-3" />}
                          {paymentIntent.billingType}
                        </Badge>
                        {isPolling && (
                          <Badge variant="secondary" className="gap-1 animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Aguardando pagamento...
                          </Badge>
                        )}
                      </div>

                      {/* PIX QR Code */}
                      {paymentIntent.billingType === 'PIX' && paymentIntent.pixQrCodeImage && (
                        <div className="flex flex-col items-center gap-3">
                          <div className="bg-white p-3 rounded-lg border">
                            <img
                              src={`data:image/png;base64,${paymentIntent.pixQrCodeImage}`}
                              alt="QR Code PIX"
                              className="w-52 h-52"
                            />
                          </div>
                          {paymentIntent.pixQrCode && (
                            <Button variant="outline" size="sm" onClick={handleCopyPixCode} className="gap-1">
                              <Copy className="h-3.5 w-3.5" />
                              Copiar código PIX
                            </Button>
                          )}
                          {paymentIntent.pixExpiration && (
                            <p className="text-xs text-muted-foreground">
                              Expira em: {new Date(paymentIntent.pixExpiration).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Credit Card / Boleto - Invoice Link */}
                      {(paymentIntent.billingType === 'CREDIT_CARD' || paymentIntent.billingType === 'BOLETO') && (
                        <div className="flex flex-col items-center gap-3 py-4">
                          <p className="text-sm text-center text-muted-foreground">
                            {paymentIntent.billingType === 'CREDIT_CARD'
                              ? 'Abra o link abaixo para o cliente pagar com cartão:'
                              : 'Abra o link abaixo para gerar o boleto:'}
                          </p>
                          {paymentIntent.invoiceUrl && (
                            <Button onClick={handleOpenInvoice} className="gap-2">
                              <ExternalLink className="h-4 w-4" />
                              Abrir Link de Pagamento
                            </Button>
                          )}
                          {paymentIntent.bankSlipUrl && (
                            <Button
                              variant="outline"
                              onClick={() => window.open(paymentIntent.bankSlipUrl!, '_blank')}
                              className="gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Abrir Boleto
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Cancel / Retry */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            onCancelOnlinePayment?.();
                            onResetOnlinePayment?.();
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => onResetOnlinePayment?.()}
                        >
                          Outro Método
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}

              {/* ====== PIX RÁPIDO TAB ====== */}
              {hasPixRapido && (
                <TabsContent value="pix-rapido" className="space-y-3 mt-3">
                  {/* Loading options */}
                  {isLoadingPixRapidoOptions && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Carregando opções PIX...</p>
                    </div>
                  )}

                  {/* No options available */}
                  {!isLoadingPixRapidoOptions && pixRapidoOptions.length === 0 && !pixRapidoIntent && !isCreatingPixRapido && (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">Nenhuma opção de PIX Rápido disponível para sua loja.</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={onLoadPixRapidoOptions}>
                        Recarregar
                      </Button>
                    </div>
                  )}

                  {/* PSP selection */}
                  {!isLoadingPixRapidoOptions && pixRapidoOptions.length > 0 && !pixRapidoIntent && !isCreatingPixRapido && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">PIX sem CPF — selecione a opção:</p>
                      {pixRapidoOptions.map((option) => {
                        const estimatedFee = estimatePixRapidoFee?.(total, option) || 0;
                        return (
                          <Button
                            key={option.psp_provider_id}
                            variant="outline"
                            className="w-full justify-start h-auto py-3"
                            onClick={() => onCreatePixRapido?.(option.psp_provider_id)}
                          >
                            <Zap className="h-5 w-5 mr-3 text-primary shrink-0" />
                            <div className="text-left flex-1">
                              <p className="font-medium">{option.psp_display_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {option.pricing_plan_name || 'Taxa padrão'} — taxa estimada {formatCurrency(estimatedFee)}
                              </p>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  {/* Creating */}
                  {isCreatingPixRapido && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Gerando PIX Rápido...</p>
                    </div>
                  )}

                  {/* Error fallback */}
                  {pixRapidoError && !isCreatingPixRapido && !pixRapidoIntent && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-destructive">Falha ao gerar PIX</p>
                          <p className="text-muted-foreground text-xs">{pixRapidoError}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => onResetPixRapido?.()}>
                          Tentar novamente
                        </Button>
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={() => {
                            onResetPixRapido?.();
                            setActiveTab('manual');
                          }}
                        >
                          <Banknote className="h-4 w-4 mr-1" />
                          Pagamento Manual
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* QR Code display */}
                  {pixRapidoIntent && !isCreatingPixRapido && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="gap-1">
                          <Zap className="h-3 w-3" />
                          {pixRapidoIntent.psp_name}
                        </Badge>
                        {isPollingPixRapido && (
                          <Badge variant="secondary" className="gap-1 animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Aguardando...
                          </Badge>
                        )}
                      </div>

                      {pixRapidoIntent.qr_code && (
                        <div className="flex flex-col items-center gap-3">
                          <div className="bg-white p-3 rounded-lg border">
                            {pixRapidoIntent.qr_code_url ? (
                              <img src={pixRapidoIntent.qr_code_url} alt="QR Code PIX" className="w-52 h-52" />
                            ) : (
                              <div className="w-52 h-52 flex items-center justify-center bg-muted rounded text-xs text-center text-muted-foreground p-4">
                                <div>
                                  <QrCode className="h-16 w-16 mx-auto mb-2 text-primary" />
                                  <p>QR Code simulado</p>
                                  <p className="font-mono text-[10px] mt-1 break-all">{pixRapidoIntent.txid}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <Button variant="outline" size="sm" onClick={handleCopyPixRapidoCode} className="gap-1">
                            <Copy className="h-3.5 w-3.5" />
                            Copiar código PIX
                          </Button>
                          <div className="text-xs text-muted-foreground text-center space-y-1">
                            <p>Taxa plataforma: {formatCurrency(pixRapidoIntent.platform_fee)}</p>
                            <p>Expira: {new Date(pixRapidoIntent.expires_at).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => onResetPixRapido?.()}>
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => onResetPixRapido?.()}>
                          Outro Método
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}

              {/* ====== MANUAL PAYMENT TAB ====== */}
              <TabsContent value="manual" className="space-y-3 mt-3">
                <p className="text-sm text-muted-foreground">Registrar pagamento manual (sem gateway):</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedMethod === 'cash' ? 'default' : 'outline'}
                    className="justify-start h-14"
                    onClick={() => onSelectMethod('cash')}
                    disabled={isProcessing}
                  >
                    <Banknote className="h-5 w-5 mr-2" />
                    Dinheiro
                  </Button>
                  <Button
                    variant={selectedMethod === 'pix' ? 'default' : 'outline'}
                    className="justify-start h-14"
                    onClick={() => onSelectMethod('pix')}
                    disabled={isProcessing}
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    Pix Manual
                  </Button>
                  <Button
                    variant={selectedMethod === 'credit_card' ? 'default' : 'outline'}
                    className="justify-start h-14"
                    onClick={() => onSelectMethod('credit_card')}
                    disabled={isProcessing}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Crédito
                  </Button>
                  <Button
                    variant={selectedMethod === 'debit_card' ? 'default' : 'outline'}
                    className="justify-start h-14"
                    onClick={() => onSelectMethod('debit_card')}
                    disabled={isProcessing}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Débito
                  </Button>
                </div>
                <Button
                  className="w-full h-12"
                  disabled={!selectedMethod || isProcessing}
                  onClick={onConfirm}
                >
                  {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
