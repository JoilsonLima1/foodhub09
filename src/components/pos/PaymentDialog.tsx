import { useState } from 'react';
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
import { CreditCard, Banknote, QrCode, FileText, Loader2, CheckCircle, ExternalLink, Copy, X, Wifi, WifiOff } from 'lucide-react';
import type { PaymentMethod } from '@/types/database';
import type { POSPaymentIntent, POSBillingType } from '@/hooks/usePOSPayment';
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
  // Online payment props
  onCreateOnlinePayment?: (billingType: POSBillingType, customerCpfCnpj?: string) => Promise<void>;
  paymentIntent?: POSPaymentIntent | null;
  paymentConfirmed?: boolean;
  isCreatingOnline?: boolean;
  isPolling?: boolean;
  onCancelOnlinePayment?: () => void;
  onResetOnlinePayment?: () => void;
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
  onCreateOnlinePayment,
  paymentIntent,
  paymentConfirmed = false,
  isCreatingOnline = false,
  isPolling = false,
  onCancelOnlinePayment,
  onResetOnlinePayment,
}: PaymentDialogProps) {
  const [activeTab, setActiveTab] = useState<string>('online');
  const [customerCpf, setCustomerCpf] = useState('');
  const hasOnlineSupport = !!onCreateOnlinePayment;

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

  const cpfDigits = customerCpf.replace(/\D/g, '');
  const isCpfValid = cpfDigits.length === 11 || cpfDigits.length === 14;

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
      // Reset online payment state when closing without confirmation
      if (paymentIntent && !paymentConfirmed) {
        onCancelOnlinePayment?.();
      }
      onResetOnlinePayment?.();
    }
    onOpenChange(open);
  };

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

          {/* Payment confirmed state */}
          {paymentConfirmed && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="h-16 w-16 text-primary" />
              <p className="text-xl font-bold text-primary">Pagamento Confirmado!</p>
              <p className="text-sm text-muted-foreground">O pagamento foi recebido com sucesso.</p>
              <Button className="w-full mt-2" onClick={onConfirm}>
                Finalizar Pedido
              </Button>
            </div>
          )}

          {/* Payment flow (only show when not confirmed) */}
          {!paymentConfirmed && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${hasOnlineSupport ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {hasOnlineSupport && (
                  <TabsTrigger value="online" className="gap-1">
                    <Wifi className="h-3.5 w-3.5" />
                    Online
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
                  {/* If no payment intent yet, show billing type selection */}
                  {!paymentIntent && !isCreatingOnline && (
                    <div className="space-y-3">
                      {/* CPF/CNPJ field */}
                      <div className="space-y-1.5">
                        <Label htmlFor="cpf-cnpj" className="text-sm font-medium">
                          CPF/CNPJ do cliente <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cpf-cnpj"
                          placeholder="000.000.000-00"
                          value={customerCpf}
                          onChange={(e) => setCustomerCpf(formatCpfCnpj(e.target.value))}
                          className="font-mono"
                        />
                        {customerCpf && !isCpfValid && (
                          <p className="text-xs text-destructive">CPF (11 dígitos) ou CNPJ (14 dígitos)</p>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">Selecione o meio de pagamento online:</p>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-14"
                        onClick={() => onCreateOnlinePayment?.('PIX', cpfDigits)}
                        disabled={isCreatingOnline || !isCpfValid}
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
                        onClick={() => onCreateOnlinePayment?.('CREDIT_CARD', cpfDigits)}
                        disabled={isCreatingOnline || !isCpfValid}
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
                        onClick={() => onCreateOnlinePayment?.('BOLETO', cpfDigits)}
                        disabled={isCreatingOnline || !isCpfValid}
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

                  {/* Payment intent created - show details */}
                  {paymentIntent && !isCreatingOnline && (
                    <div className="space-y-4">
                      {/* Status badge */}
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCopyPixCode}
                              className="gap-1"
                            >
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
