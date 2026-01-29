import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Phone, Settings2, CheckCircle2, XCircle, PhoneCall, Users, Clock, History, Loader2 } from 'lucide-react';
import { useCallerID } from '@/hooks/useCallerID';
import { Badge } from '@/components/ui/badge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface IntegrationBinaPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function IntegrationBinaPanel({ module, onBack }: IntegrationBinaPanelProps) {
  const { config, callLogs, stats, isLoading, saveConfig } = useCallerID();
  const isConnected = config?.is_active && config?.hardware_port;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Phone className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">Bina Telefônica</h1>
            <Badge variant="outline">{module?.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Identificação de chamadas com histórico</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? <CheckCircle2 className="h-8 w-8 text-green-600" /> : <XCircle className="h-8 w-8 text-muted-foreground" />}
              <div>
                <h3 className="font-semibold">{isConnected ? 'Hardware Conectado' : 'Aguardando Conexão'}</h3>
                <p className="text-sm text-muted-foreground">{isConnected ? `Porta ${config?.hardware_port}` : 'Configure o hardware'}</p>
              </div>
            </div>
            <Switch checked={config?.is_active ?? false} onCheckedChange={(checked) => saveConfig.mutate({ is_active: checked })} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4 text-center"><PhoneCall className="h-8 w-8 mx-auto text-blue-600 mb-2" /><p className="text-2xl font-bold">{stats.callsToday}</p><p className="text-sm text-muted-foreground">Chamadas Hoje</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Users className="h-8 w-8 mx-auto text-green-600 mb-2" /><p className="text-2xl font-bold">{stats.customersIdentified}</p><p className="text-sm text-muted-foreground">Identificados</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><History className="h-8 w-8 mx-auto text-purple-600 mb-2" /><p className="text-2xl font-bold">{stats.ordersCreated}</p><p className="text-sm text-muted-foreground">Pedidos</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-8 w-8 mx-auto text-amber-600 mb-2" /><p className="text-2xl font-bold">{stats.avgDuration || '-'}s</p><p className="text-sm text-muted-foreground">Duração Média</p></CardContent></Card>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config"><Settings2 className="h-4 w-4 mr-2" />Configurações</TabsTrigger>
          <TabsTrigger value="hardware"><Phone className="h-4 w-4 mr-2" />Hardware</TabsTrigger>
        </TabsList>
        <TabsContent value="config">
          <Card>
            <CardHeader><CardTitle>Configurações</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Popup Automático</Label><p className="text-sm text-muted-foreground">Abrir ficha ao receber ligação</p></div>
                <Switch checked={config?.auto_popup ?? true} onCheckedChange={(checked) => saveConfig.mutate({ auto_popup: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Mostrar Histórico</Label><p className="text-sm text-muted-foreground">Exibir pedidos anteriores</p></div>
                <Switch checked={config?.show_history ?? true} onCheckedChange={(checked) => saveConfig.mutate({ show_history: checked })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="hardware">
          <Card>
            <CardHeader><CardTitle>Hardware</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Porta COM</Label><Input placeholder="Ex: COM3" defaultValue={config?.hardware_port || ''} onBlur={(e) => saveConfig.mutate({ hardware_port: e.target.value })} /></div>
              <div className="space-y-2"><Label>Modelo</Label><Input placeholder="Modelo do dispositivo" defaultValue={config?.hardware_model || ''} onBlur={(e) => saveConfig.mutate({ hardware_model: e.target.value })} /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
