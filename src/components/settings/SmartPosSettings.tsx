import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Smartphone, RefreshCw, TestTube, Trash2, QrCode, Clock, Wifi, WifiOff, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useSmartPosDevices, type DeviceEvent } from '@/hooks/useSmartPosDevices';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SmartPosSettings() {
  const {
    devices,
    isLoading,
    refetch,
    toggleDevice,
    removeDevice,
    generatePairingCode,
    createTestPrintJob,
    fetchDeviceEvents,
  } = useSmartPosDevices();

  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiry, setPairingExpiry] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [deviceEvents, setDeviceEvents] = useState<Record<string, DeviceEvent[]>>({});
  const [loadingEvents, setLoadingEvents] = useState<string | null>(null);

  // Auto-clear expired pairing code
  useEffect(() => {
    if (!pairingExpiry) return;
    const timer = setInterval(() => {
      if (new Date() >= pairingExpiry) {
        setPairingCode(null);
        setPairingExpiry(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [pairingExpiry]);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const code = await generatePairingCode.mutateAsync();
      setPairingCode(code);
      setPairingExpiry(new Date(Date.now() + 10 * 60 * 1000));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleEvents = async (deviceId: string) => {
    if (expandedDevice === deviceId) {
      setExpandedDevice(null);
      return;
    }
    setExpandedDevice(deviceId);
    if (!deviceEvents[deviceId]) {
      setLoadingEvents(deviceId);
      try {
        const events = await fetchDeviceEvents(deviceId);
        setDeviceEvents((prev) => ({ ...prev, [deviceId]: events }));
      } finally {
        setLoadingEvents(null);
      }
    }
  };

  const timeLeft = pairingExpiry
    ? Math.max(0, Math.floor((pairingExpiry.getTime() - Date.now()) / 1000))
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pairing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Parear Maquininha
          </CardTitle>
          <CardDescription>
            Gere um código para conectar uma maquininha SmartPOS ao seu estabelecimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pairingCode && timeLeft > 0 ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-muted-foreground">Digite este código no app da maquininha:</p>
              <div className="text-5xl font-mono font-bold tracking-[0.3em] text-primary select-all">
                {pairingCode}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Expira em {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerateCode} disabled={isGenerating}>
                <RefreshCw className="h-4 w-4 mr-2" /> Gerar novo código
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <Smartphone className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Clique para gerar um código de pareamento. O código expira em 10 minutos.
              </p>
              <Button onClick={handleGenerateCode} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                Gerar Código de Pareamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Devices List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Dispositivos Pareados
              </CardTitle>
              <CardDescription>{devices.length} dispositivo(s)</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Smartphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              Nenhum dispositivo SmartPOS pareado ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((dev) => {
                const isOnline = dev.status === 'online';
                const lastSeenText = dev.last_seen_at
                  ? formatDistanceToNow(new Date(dev.last_seen_at), { addSuffix: true, locale: ptBR })
                  : 'Nunca';
                const isExpanded = expandedDevice === dev.id;

                return (
                  <div key={dev.id} className="border rounded-lg">
                    <div className="flex items-center justify-between p-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isOnline ? (
                          <Wifi className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{dev.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {dev.model || 'SmartPOS'} · Visto {lastSeenText}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={isOnline ? 'default' : 'secondary'} className="text-xs">
                          {isOnline ? 'Online' : 'Offline'}
                        </Badge>
                        <Switch
                          checked={dev.enabled}
                          onCheckedChange={(enabled) => toggleDevice.mutate({ id: dev.id, enabled })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => createTestPrintJob.mutate(dev.id)}
                          title="Testar impressão"
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleEvents(dev.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remover "${dev.name}"? O dispositivo precisará ser pareado novamente.`)) {
                              removeDevice.mutate(dev.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Events Log */}
                    {isExpanded && (
                      <div className="border-t px-3 py-2 bg-muted/30 max-h-60 overflow-y-auto">
                        {loadingEvents === dev.id ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (deviceEvents[dev.id] || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">Nenhum evento registrado.</p>
                        ) : (
                          <div className="space-y-1">
                            {(deviceEvents[dev.id] || []).map((ev) => (
                              <div key={ev.id} className="flex items-start gap-2 text-xs py-1">
                                {ev.level === 'error' ? (
                                  <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                                ) : (
                                  <div className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span className="text-muted-foreground">
                                  {new Date(ev.created_at).toLocaleString('pt-BR', {
                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                                  })}
                                </span>
                                <span className="font-medium">{ev.event_type}</span>
                                {ev.message && <span className="text-muted-foreground truncate">{ev.message}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
