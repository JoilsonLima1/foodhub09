import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Scan, 
  Camera, 
  Keyboard, 
  X, 
  Check, 
  AlertCircle,
  QrCode,
  Barcode,
} from 'lucide-react';
import { useBarcodeScanner, BarcodeScanResult } from '@/hooks/useBarcodeScanner';

interface BarcodeScannerProps {
  onScan: (result: BarcodeScanResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showLastScan?: boolean;
  compact?: boolean;
}

export function BarcodeScanner({
  onScan,
  placeholder = 'Código de barras...',
  autoFocus = false,
  showLastScan = true,
  compact = false,
}: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState('');
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  
  const {
    isScanning,
    lastScan,
    error,
    isCameraSupported,
    startCamera,
    stopCamera,
    videoRef,
    enableKeyboard,
    disableKeyboard,
    processCode,
    clearLastScan,
  } = useBarcodeScanner({
    mode: 'keyboard',
    onScan,
    enabled: true,
  });

  // Handle manual input submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processCode(manualCode.trim());
      setManualCode('');
    }
  };

  // Handle camera dialog
  const handleOpenCamera = async () => {
    setIsCameraDialogOpen(true);
    await startCamera();
  };

  const handleCloseCamera = () => {
    stopCamera();
    setIsCameraDialogOpen(false);
  };

  // When a scan is detected in camera mode, close the dialog
  useEffect(() => {
    if (lastScan && isCameraDialogOpen) {
      handleCloseCamera();
    }
  }, [lastScan]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <form onSubmit={handleManualSubmit} className="flex-1 flex gap-2">
          <Input
            type="text"
            placeholder={placeholder}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            autoFocus={autoFocus}
            className="font-mono"
          />
          <Button type="submit" size="icon" variant="outline">
            <Scan className="h-4 w-4" />
          </Button>
        </form>
        
        {isCameraSupported && (
          <Dialog open={isCameraDialogOpen} onOpenChange={(open) => {
            if (!open) handleCloseCamera();
          }}>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" onClick={handleOpenCamera}>
                <Camera className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <CameraScannerDialog
              videoRef={videoRef}
              isScanning={isScanning}
              onClose={handleCloseCamera}
              error={error}
            />
          </Dialog>
        )}

        {showLastScan && lastScan && (
          <Badge variant="secondary" className="gap-1">
            <Barcode className="h-3 w-3" />
            {lastScan.code.slice(0, 10)}...
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Leitor de Código de Barras
          </div>
          <Badge variant="default" className="gap-1">
            <Keyboard className="h-3 w-3" />
            USB Ativo
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="auto" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto" className="gap-2">
              <Keyboard className="h-4 w-4" />
              Automático
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Scan className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="auto" className="space-y-4">
            <div className="text-center py-4">
              <Barcode className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Use o leitor USB para escanear códigos de barras
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                O leitor USB já está pronto para uso
              </p>
            </div>

            {isCameraSupported && (
              <Dialog open={isCameraDialogOpen} onOpenChange={(open) => {
                if (!open) handleCloseCamera();
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2" onClick={handleOpenCamera}>
                    <Camera className="h-4 w-4" />
                    Usar Câmera
                  </Button>
                </DialogTrigger>
                <CameraScannerDialog
                  videoRef={videoRef}
                  isScanning={isScanning}
                  onClose={handleCloseCamera}
                  error={error}
                />
              </Dialog>
            )}
          </TabsContent>
          
          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Código de Barras</Label>
                <Input
                  type="text"
                  placeholder="Digite ou cole o código..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  autoFocus
                  className="font-mono"
                />
              </div>
              <Button type="submit" className="w-full">
                Buscar Produto
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {showLastScan && lastScan && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Último código lido:</p>
                <p className="font-mono text-lg">{lastScan.code}</p>
                <p className="text-xs text-muted-foreground">
                  Formato: {lastScan.format} • {lastScan.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={clearLastScan}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CameraScannerDialogProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isScanning: boolean;
  onClose: () => void;
  error: string | null;
}

function CameraScannerDialog({ videoRef, isScanning, onClose, error }: CameraScannerDialogProps) {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Escanear com Câmera</DialogTitle>
        <DialogDescription>
          Aponte a câmera para o código de barras
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          
          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-1/3 border-2 border-primary rounded-lg">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-lg" />
            </div>
          </div>

          {isScanning && (
            <div className="absolute top-2 left-2">
              <Badge variant="default" className="gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Escaneando...
              </Badge>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </DialogContent>
  );
}

// Quick scan button for toolbar usage
interface QuickScanButtonProps {
  onScan: (result: BarcodeScanResult) => void;
}

export function QuickScanButton({ onScan }: QuickScanButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleScan = (result: BarcodeScanResult) => {
    onScan(result);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escanear Código</DialogTitle>
        </DialogHeader>
        <BarcodeScanner onScan={handleScan} autoFocus showLastScan={false} />
      </DialogContent>
    </Dialog>
  );
}
