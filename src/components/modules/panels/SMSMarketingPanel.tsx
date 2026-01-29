import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MessageSquare, Settings2, Send, Users, BarChart3, Zap, Loader2, Plus } from 'lucide-react';
import { useSMSMarketing } from '@/hooks/useSMSMarketing';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface SMSMarketingPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function SMSMarketingPanel({ module, onBack }: SMSMarketingPanelProps) {
  const { config, campaigns, stats, isLoading, saveConfig, createCampaign, sendCampaign } = useSMSMarketing();
  const [newCampaign, setNewCampaign] = useState({ name: '', message: '' });

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.message) return;
    createCampaign.mutate({ name: newCampaign.name, message_template: newCampaign.message, target_audience: 'all' });
    setNewCampaign({ name: '', message: '' });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-green-600" />
            <h1 className="text-xl font-bold">SMS Marketing</h1>
            <Badge variant="outline">{module?.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Campanhas de SMS para clientes</p>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Saldo</p>
              <p className="text-3xl font-bold">{stats.messagesRemaining} SMS</p>
            </div>
            <Button variant="secondary">Comprar Créditos</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4 text-center"><Send className="h-8 w-8 mx-auto text-green-600 mb-2" /><p className="text-2xl font-bold">{stats.messagesSent}</p><p className="text-sm text-muted-foreground">Enviados</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><BarChart3 className="h-8 w-8 mx-auto text-blue-600 mb-2" /><p className="text-2xl font-bold">{stats.deliveryRate.toFixed(0)}%</p><p className="text-sm text-muted-foreground">Taxa Entrega</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Users className="h-8 w-8 mx-auto text-purple-600 mb-2" /><p className="text-2xl font-bold">{stats.totalCampaigns}</p><p className="text-sm text-muted-foreground">Campanhas</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Zap className="h-8 w-8 mx-auto text-amber-600 mb-2" /><p className="text-2xl font-bold">{stats.messagesRemaining}</p><p className="text-sm text-muted-foreground">Restantes</p></CardContent></Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns"><Zap className="h-4 w-4 mr-2" />Campanhas</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="h-4 w-4 mr-2" />Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Campanhas</CardTitle><CardDescription>Gerencie suas campanhas</CardDescription></div>
              <Dialog>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova Campanha</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2"><Label>Nome</Label><Input value={newCampaign.name} onChange={(e) => setNewCampaign(p => ({ ...p, name: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Mensagem</Label><Textarea maxLength={160} value={newCampaign.message} onChange={(e) => setNewCampaign(p => ({ ...p, message: e.target.value }))} /><p className="text-xs text-muted-foreground">{newCampaign.message.length}/160</p></div>
                    <Button className="w-full" onClick={handleCreateCampaign} disabled={createCampaign.isPending}>Criar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>Nenhuma campanha</p></div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {campaigns.map((c) => (
                      <div key={c.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{c.name}</h4>
                          <Badge>{c.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{c.message_template}</p>
                        {c.status === 'draft' && <Button size="sm" className="mt-2" onClick={() => sendCampaign.mutate(c.id)}><Send className="h-3 w-3 mr-1" />Enviar</Button>}
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
            <CardHeader><CardTitle>Configurações</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Provedor</Label><Input defaultValue={config?.provider || ''} onBlur={(e) => saveConfig.mutate({ provider: e.target.value })} /></div>
              <div className="space-y-2"><Label>Remetente</Label><Input defaultValue={config?.sender_id || ''} onBlur={(e) => saveConfig.mutate({ sender_id: e.target.value })} /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
