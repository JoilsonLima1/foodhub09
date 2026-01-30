import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Zap,
  Settings2,
  MessageSquare,
  Users,
  BarChart3,
  Clock,
  Send,
  Target,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Edit2,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';
import { useDispatcher, TRIGGER_TYPES } from '@/hooks/useDispatcher';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IntelligentDispatcherPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function IntelligentDispatcherPanel({ module, onBack }: IntelligentDispatcherPanelProps) {
  const {
    config,
    triggers,
    messages,
    stats,
    isLoading,
    saveConfig,
    createTrigger,
    updateTrigger,
    deleteTrigger,
    toggleTrigger,
  } = useDispatcher();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTrigger, setNewTrigger] = useState({
    name: '',
    trigger_type: 'order_confirmed',
    delay_minutes: 0,
    message_template: '',
    channel: 'whatsapp' as 'whatsapp' | 'sms' | 'both',
  });

  const handleCreateTrigger = () => {
    if (!newTrigger.name.trim() || !newTrigger.message_template.trim()) {
      return;
    }
    createTrigger.mutate(newTrigger, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setNewTrigger({
          name: '',
          trigger_type: 'order_confirmed',
          delay_minutes: 0,
          message_template: '',
          channel: 'whatsapp',
        });
      },
    });
  };

  const getTriggerIcon = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type)?.icon || '📤';
  };

  const getTriggerLabel = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="text-blue-600">Enviado</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="text-green-600">Entregue</Badge>;
      case 'read':
        return <Badge className="bg-green-600">Lido</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
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
            <Zap className="h-6 w-6 text-yellow-500" />
            <h1 className="text-xl font-bold">Disparador Inteligente</h1>
            <ModuleStatusBadge status="ready" />
          </div>
          <p className="text-sm text-muted-foreground">
            Automação de mensagens e notificações para clientes
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Send className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <p className="text-2xl font-bold">{stats.messagesToday}</p>
            <p className="text-sm text-muted-foreground">Mensagens Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{stats.deliveredToday}</p>
            <p className="text-sm text-muted-foreground">Entregues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="text-2xl font-bold">{stats.failedToday}</p>
            <p className="text-sm text-muted-foreground">Falhas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{stats.activeTriggers}</p>
            <p className="text-sm text-muted-foreground">Gatilhos Ativos</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="automations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="automations">
            <Zap className="h-4 w-4 mr-2" />
            Automações
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gatilhos de Automação</CardTitle>
                <CardDescription>
                  Configure quando e como enviar mensagens automaticamente
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Gatilho
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Gatilho</DialogTitle>
                    <DialogDescription>
                      Configure uma nova automação de mensagens
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Nome do Gatilho *</Label>
                      <Input
                        placeholder="Ex: Confirmação de Pedido"
                        value={newTrigger.name}
                        onChange={(e) => setNewTrigger(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Evento de Disparo</Label>
                      <Select
                        value={newTrigger.trigger_type}
                        onValueChange={(value) => setNewTrigger(prev => ({ ...prev, trigger_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGER_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <span className="flex items-center gap-2">
                                <span>{type.icon}</span>
                                <span>{type.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Atraso (minutos)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={newTrigger.delay_minutes}
                          onChange={(e) => setNewTrigger(prev => ({ ...prev, delay_minutes: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Canal</Label>
                        <Select
                          value={newTrigger.channel}
                          onValueChange={(value: 'whatsapp' | 'sms' | 'both') => setNewTrigger(prev => ({ ...prev, channel: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="both">Ambos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Mensagem *</Label>
                      <Textarea
                        placeholder="Olá {nome}! Seu pedido #{numero} foi confirmado..."
                        rows={4}
                        value={newTrigger.message_template}
                        onChange={(e) => setNewTrigger(prev => ({ ...prev, message_template: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Variáveis: {'{nome}'}, {'{numero}'}, {'{total}'}, {'{status}'}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateTrigger} disabled={createTrigger.isPending}>
                        {createTrigger.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Criar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : triggers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhum gatilho configurado</p>
                  <p className="text-sm">Crie seu primeiro gatilho para começar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {triggers.map((trigger) => (
                    <div key={trigger.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{getTriggerIcon(trigger.trigger_type)}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{trigger.name}</h4>
                              <Badge variant={trigger.is_active ? 'default' : 'secondary'}>
                                {trigger.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <Badge variant="outline">{trigger.channel}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getTriggerLabel(trigger.trigger_type)}
                              {trigger.delay_minutes > 0 && ` • Atraso: ${trigger.delay_minutes}min`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={trigger.is_active}
                            onCheckedChange={(checked) => toggleTrigger.mutate({ id: trigger.id, is_active: checked })}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteTrigger.mutate(trigger.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Mensagens</CardTitle>
              <CardDescription>
                Últimas mensagens enviadas pelo sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma mensagem enviada ainda</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div key={msg.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{msg.channel}</Badge>
                              {getStatusBadge(msg.status)}
                            </div>
                            <p className="text-sm">{msg.customer_phone}</p>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {msg.message}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {msg.error_message && (
                          <p className="text-xs text-destructive mt-2">{msg.error_message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Canais</CardTitle>
              <CardDescription>
                Configure os canais de comunicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>WhatsApp Business API</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar mensagens via WhatsApp
                  </p>
                </div>
                <Switch
                  checked={config?.whatsapp_enabled ?? false}
                  onCheckedChange={(checked) => saveConfig.mutate({ whatsapp_enabled: checked })}
                />
              </div>

              {config?.whatsapp_enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <Input
                      type="password"
                      placeholder="ID do número do WhatsApp"
                      value={config?.whatsapp_phone_id || ''}
                      onChange={(e) => saveConfig.mutate({ whatsapp_phone_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Token</Label>
                    <Input
                      type="password"
                      placeholder="Token de acesso da API"
                      value={config?.whatsapp_api_token || ''}
                      onChange={(e) => saveConfig.mutate({ whatsapp_api_token: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar mensagens via SMS
                  </p>
                </div>
                <Switch
                  checked={config?.sms_enabled ?? false}
                  onCheckedChange={(checked) => saveConfig.mutate({ sms_enabled: checked })}
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
