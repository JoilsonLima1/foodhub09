import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Camera, CheckCircle, XCircle, Loader2, ScanBarcode } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useValidateTicket } from '@/hooks/useEvents';
import { cn } from '@/lib/utils';

interface TicketValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ValidationResult = {
  success: boolean;
  message: string;
  ticketCode?: string;
} | null;

export function TicketValidationDialog({ open, onOpenChange }: TicketValidationDialogProps) {
  const [mode, setMode] = useState<'scanner' | 'camera' | 'manual'>('scanner');
  const [manualCode, setManualCode] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult>(null);
  
  const validateTicket = useValidateTicket();

  const handleValidation = useCallback((code: string) => {
    if (!code || validateTicket.isPending) return;
    
    setValidationResult(null);
    
    validateTicket.mutate(code, {
      onSuccess: () => {
        setValidationResult({
          success: true,
          message: 'Ingresso validado com sucesso!',
          ticketCode: code,
        });
        setManualCode('');
        
        // Auto-clear success after 3 seconds
        setTimeout(() => setValidationResult(null), 3000);
      },
      onError: (error) => {
        setValidationResult({
          success: false,
          message: error.message || 'Erro ao validar ingresso',
          ticketCode: code,
        });
        
        // Auto-clear error after 5 seconds
        setTimeout(() => setValidationResult(null), 5000);
      },
    });
  }, [validateTicket]);

  // Barcode scanner hook - keyboard mode (USB scanners)
  const {
    lastScan: keyboardScan,
    clearLastScan: clearKeyboardScan,
  } = useBarcodeScanner({
    mode: 'keyboard',
    enabled: open && mode === 'scanner',
    onScan: (result) => {
      handleValidation(result.code);
    },
  });

  // Barcode scanner hook - camera mode
  const {
    isScanning: isCameraActive,
    lastScan: cameraScan,
    error: cameraError,
    isCameraSupported,
    startCamera,
    stopCamera,
    videoRef,
    clearLastScan: clearCameraScan,
  } = useBarcodeScanner({
    mode: 'camera',
    enabled: false, // manually controlled
    onScan: (result) => {
      handleValidation(result.code);
    },
  });

  // Handle mode changes
  useEffect(() => {
    if (mode === 'camera' && open) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [mode, open, startCamera, stopCamera]);

  // Clear scans when dialog closes
  useEffect(() => {
    if (!open) {
      clearKeyboardScan();
      clearCameraScan();
      setValidationResult(null);
      setManualCode('');
      stopCamera();
    }
  }, [open, clearKeyboardScan, clearCameraScan, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      handleValidation(manualCode);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Validar Ingresso
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scanner" className="gap-2">
              <Keyboard className="h-4 w-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="camera" className="gap-2" disabled={!isCameraSupported}>
              <Camera className="h-4 w-4" />
              Câmera
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              Manual
            </TabsTrigger>
          </TabsList>

          {/* Scanner Mode (USB barcode scanners) */}
          <TabsContent value="scanner" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                    <ScanBarcode className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Scanner USB Ativo</p>
                    <p className="text-sm text-muted-foreground">
                      Use o leitor de código de barras para escanear o ingresso
                    </p>
                  </div>
                  {keyboardScan && (
                    <p className="text-sm font-mono bg-muted px-3 py-1 rounded">
                      Último: {keyboardScan.code}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Camera Mode */}
          <TabsContent value="camera" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {cameraError ? (
                    <div className="text-center text-destructive">
                      <XCircle className="h-12 w-12 mx-auto mb-2" />
                      <p>{cameraError}</p>
                      <Button
                        variant="outline"
                        onClick={() => startCamera()}
                        className="mt-4"
                      >
                        Tentar Novamente
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          playsInline
                          muted
                        />
                        {!isCameraActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                          </div>
                        )}
                        {/* Scan area overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-3/4 h-1/3 border-2 border-white/70 rounded-lg" />
                        </div>
                      </div>
                      <p className="text-sm text-center text-muted-foreground">
                        Aponte a câmera para o código de barras do ingresso
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Mode */}
          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Código do Ingresso</Label>
                <Input
                  placeholder="TKT-XXXXX-XXXX"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  autoFocus
                  className="font-mono"
                />
              </div>
              <Button
                type="submit"
                disabled={!manualCode || validateTicket.isPending}
                className="w-full"
              >
                {validateTicket.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  'Validar Ingresso'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Validation Result */}
        {validationResult && (
          <Card className={cn(
            "border-2 transition-colors",
            validationResult.success 
              ? "border-green-500 bg-green-500/10" 
              : "border-destructive bg-destructive/10"
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                {validationResult.success ? (
                  <CheckCircle className="h-12 w-12 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-12 w-12 text-destructive flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-semibold text-lg",
                    validationResult.success ? "text-green-600" : "text-destructive"
                  )}>
                    {validationResult.success ? 'Entrada Liberada!' : 'Entrada Negada'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {validationResult.message}
                  </p>
                  {validationResult.ticketCode && (
                    <Badge variant="outline" className="mt-2 font-mono">
                      {validationResult.ticketCode}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {validateTicket.isPending && !validationResult && (
          <Card className="border-2 border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="font-medium">Validando ingresso...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
