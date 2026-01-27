import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Scale, Wifi, WifiOff, Settings2, RefreshCw } from 'lucide-react';
import { useScale, ScaleConfig } from '@/hooks/useScale';

interface ScaleDisplayProps {
  onWeightSelect?: (weight: number) => void;
  compact?: boolean;
}

export function ScaleDisplay({ onWeightSelect, compact = false }: ScaleDisplayProps) {
  const {
    isConnected,
    isSupported,
    currentWeight,
    unit,
    isStable,
    connect,
    disconnect,
    requestWeight,
    error,
  } = useScale();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState<Partial<ScaleConfig>>({
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
  });

  const handleConnect = async () => {
    const success = await connect(config);
    if (success) {
      setIsConfigOpen(false);
    }
  };

  const handleUseWeight = () => {
    if (currentWeight !== null && isStable && onWeightSelect) {
      onWeightSelect(currentWeight);
    }
  };

  const formatWeight = (weight: number | null) => {
    if (weight === null) return '---';
    return weight.toFixed(3);
  };

  if (!isSupported) {
    return (
      <Card className={compact ? 'w-full' : 'w-64'}>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Scale className="h-4 w-4" />
            <span className="text-sm">Balança não suportada neste navegador</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <Badge variant={isStable ? 'default' : 'secondary'} className="gap-1">
              <Scale className="h-3 w-3" />
              {formatWeight(currentWeight)} {unit}
              {isStable && <span className="text-xs">✓</span>}
            </Badge>
            {onWeightSelect && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleUseWeight}
                disabled={!isStable || currentWeight === null}
              >
                Usar Peso
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={disconnect}>
              <WifiOff className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Scale className="h-4 w-4" />
                Conectar Balança
              </Button>
            </DialogTrigger>
            <ScaleConfigDialog
              config={config}
              setConfig={setConfig}
              onConnect={handleConnect}
              error={error}
            />
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Balança
          </div>
          {isConnected ? (
            <Badge variant="default" className="gap-1">
              <Wifi className="h-3 w-3" />
              Conectada
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Desconectada
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="text-center">
              <div className="text-4xl font-mono font-bold">
                {formatWeight(currentWeight)}
              </div>
              <div className="text-lg text-muted-foreground">{unit}</div>
              {isStable ? (
                <Badge variant="default" className="mt-2">Estável</Badge>
              ) : (
                <Badge variant="secondary" className="mt-2">Estabilizando...</Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleUseWeight}
                disabled={!isStable || currentWeight === null || !onWeightSelect}
              >
                Usar Peso
              </Button>
              <Button variant="outline" size="icon" onClick={requestWeight}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={disconnect}>
                <WifiOff className="h-4 w-4" />
              </Button>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground text-center">
              Conecte uma balança serial para pesagem automática
            </p>

            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2">
                  <Settings2 className="h-4 w-4" />
                  Configurar e Conectar
                </Button>
              </DialogTrigger>
              <ScaleConfigDialog
                config={config}
                setConfig={setConfig}
                onConnect={handleConnect}
                error={error}
              />
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ScaleConfigDialogProps {
  config: Partial<ScaleConfig>;
  setConfig: (config: Partial<ScaleConfig>) => void;
  onConnect: () => void;
  error: string | null;
}

function ScaleConfigDialog({ config, setConfig, onConnect, error }: ScaleConfigDialogProps) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Configurar Balança</DialogTitle>
        <DialogDescription>
          Configure os parâmetros de comunicação serial da balança
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Velocidade (Baud Rate)</Label>
          <Select
            value={String(config.baudRate)}
            onValueChange={(v) => setConfig({ ...config, baudRate: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4800">4800</SelectItem>
              <SelectItem value="9600">9600</SelectItem>
              <SelectItem value="19200">19200</SelectItem>
              <SelectItem value="38400">38400</SelectItem>
              <SelectItem value="57600">57600</SelectItem>
              <SelectItem value="115200">115200</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Bits de Dados</Label>
          <Select
            value={String(config.dataBits)}
            onValueChange={(v) => setConfig({ ...config, dataBits: Number(v) as 7 | 8 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7</SelectItem>
              <SelectItem value="8">8</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Bits de Parada</Label>
          <Select
            value={String(config.stopBits)}
            onValueChange={(v) => setConfig({ ...config, stopBits: Number(v) as 1 | 2 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Paridade</Label>
          <Select
            value={config.parity}
            onValueChange={(v) => setConfig({ ...config, parity: v as 'none' | 'even' | 'odd' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              <SelectItem value="even">Par</SelectItem>
              <SelectItem value="odd">Ímpar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button className="w-full" onClick={onConnect}>
          Conectar Balança
        </Button>
      </div>
    </DialogContent>
  );
}
