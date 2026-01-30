import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Smartphone,
  Settings2,
  QrCode,
  Users,
  ShoppingBag,
  Wifi,
  Download,
  Loader2,
  Clock,
  Copy,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';
import { useMobileCommand } from '@/hooks/useMobileCommand';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface MobileCommandPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function MobileCommandPanel({ module, onBack }: MobileCommandPanelProps) {
  const {
    config,
    sessions,
    stats,
    isLoading,
    saveConfig,
    endSession,
  } = useMobileCommand();

  const copyAccessLink = () => {
    const link = `${window.location.origin}/mobile-command`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-teal-600" />
            <h1 className="text-xl font-bold">Comanda Mobile</h1>
            <ModuleStatusBadge status="ready" />
          </div>
          <p className="text-sm text-muted-foreground">
            Lançamento de pedidos via smartphone ou tablet
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Smartphone className="h-8 w-8 mx-auto text-teal-600 mb-2" />
            <p className="text-2xl font-bold">{sessions.length}</p>
            <p className="text-sm text-muted-foreground">Sessões Totais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wifi className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{stats.activeSessions}</p>
            <p className="text-sm text-muted-foreground">Online Agora</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{stats.activeDevices}</p>
            <p className="text-sm text-muted-foreground">Dispositivos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Garçons</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">
            <Smartphone className="h-4 w-4 mr-2" />
            Sessões
          </TabsTrigger>
          <TabsTrigger value="qrcode">
            <QrCode className="h-4 w-4 mr-2" />
            Acesso
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Sessões Ativas</CardTitle>
              <CardDescription>
                Dispositivos conectados ao sistema de comanda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma sessão ativa</p>
                  <p className="text-sm">Use o QR Code para conectar um dispositivo</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div key={session.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              session.is_active 
                                ? 'bg-green-100 dark:bg-green-900' 
                                : 'bg-muted'
                            }`}>
                              <Smartphone className={`h-5 w-5 ${
                                session.is_active ? 'text-green-600' : 'text-muted-foreground'
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">
                                  {session.device_name || 'Dispositivo'}
                                </h4>
                                <Badge className={session.is_active ? 'bg-green-600' : ''}>
                                  {session.is_active ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(session.last_activity_at), "HH:mm", { locale: ptBR })}
                                </span>
                                {session.user?.full_name && (
                                  <span>{session.user.full_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {session.is_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => endSession.mutate(session.id)}
                                disabled={endSession.isPending}
                              >
                                Encerrar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qrcode">
          <Card>
            <CardHeader>
              <CardTitle>Acesso ao App</CardTitle>
              <CardDescription>
                QR Code e link para acessar a comanda mobile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <div className="h-48 w-48 mx-auto bg-white dark:bg-gray-100 rounded-lg flex items-center justify-center mb-4 border">
                  <div className="text-center">
                    <QrCode className="h-32 w-32 text-gray-800" />
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  Escaneie com o celular para acessar
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={copyAccessLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar QR Code
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Link de Acesso</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={`${window.location.origin}/mobile-command`}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyAccessLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Comanda</CardTitle>
              <CardDescription>
                Personalize o comportamento da comanda mobile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Vincular à Mesa</Label>
                  <p className="text-sm text-muted-foreground">
                    Obrigar seleção de mesa ao abrir comanda
                  </p>
                </div>
                <Switch
                  checked={config?.require_table ?? true}
                  onCheckedChange={(checked) => saveConfig.mutate({ require_table: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir Divisão de Conta</Label>
                  <p className="text-sm text-muted-foreground">
                    Clientes podem dividir a conta entre si
                  </p>
                </div>
                <Switch
                  checked={config?.allow_split_payment ?? true}
                  onCheckedChange={(checked) => saveConfig.mutate({ allow_split_payment: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exibir Imagens dos Produtos</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar fotos dos produtos na comanda
                  </p>
                </div>
                <Switch
                  checked={config?.show_product_images ?? true}
                  onCheckedChange={(checked) => saveConfig.mutate({ show_product_images: checked })}
                />
              </div>

              <div className="pt-4">
                <Button onClick={() => saveConfig.mutate({ is_active: true })} disabled={saveConfig.isPending}>
                  {saveConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
