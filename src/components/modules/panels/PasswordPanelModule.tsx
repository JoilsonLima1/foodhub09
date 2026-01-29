import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Monitor, Settings2, Users, Clock, Loader2, Play, RotateCcw, Check, Volume2 } from 'lucide-react';
import { usePasswordPanel } from '@/hooks/usePasswordPanel';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface PasswordPanelModuleProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function PasswordPanelModule({ module, onBack }: PasswordPanelModuleProps) {
  const { config, queue, readyPasswords, stats, isLoading, saveConfig, generatePassword, callPassword, updateStatus, resetCounter } = usePasswordPanel();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Monitor className="h-6 w-6 text-cyan-600" />
            <h1 className="text-xl font-bold">Painel de Senha</h1>
            <Badge variant="outline">{module?.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Sistema de senhas para retirada</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
          <CardContent className="p-4 text-center">
            <Monitor className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold font-mono">{stats.currentNumber.toString().padStart(3, '0')}</p>
            <p className="text-sm opacity-80">Senha Atual</p>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4 text-center"><Users className="h-8 w-8 mx-auto text-blue-600 mb-2" /><p className="text-2xl font-bold">{stats.waiting}</p><p className="text-sm text-muted-foreground">Na Fila</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-8 w-8 mx-auto text-green-600 mb-2" /><p className="text-2xl font-bold">{stats.ready}</p><p className="text-sm text-muted-foreground">Prontas</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Check className="h-8 w-8 mx-auto text-amber-600 mb-2" /><p className="text-2xl font-bold">{stats.delivered}</p><p className="text-sm text-muted-foreground">Entregues</p></CardContent></Card>
      </div>

      <div className="flex gap-4">
        <Button size="lg" className="flex-1" onClick={() => generatePassword.mutate(undefined)} disabled={generatePassword.isPending}>
          {generatePassword.isPending ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
          Gerar Nova Senha
        </Button>
        <Button size="lg" variant="outline" onClick={() => resetCounter.mutate()} disabled={resetCounter.isPending}>
          <RotateCcw className="h-5 w-5 mr-2" />Reiniciar
        </Button>
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue"><Users className="h-4 w-4 mr-2" />Fila</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="h-4 w-4 mr-2" />Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="queue">
          <Card>
            <CardHeader><CardTitle>Fila de Senhas</CardTitle></CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>Fila vazia</p></div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {queue.map((item) => (
                      <div key={item.id} className={`p-4 border rounded-lg flex items-center justify-between ${item.status === 'ready' || item.status === 'called' ? 'bg-green-50 dark:bg-green-950/30' : ''}`}>
                        <div className="flex items-center gap-4">
                          <span className="text-3xl font-mono font-bold">{item.password_number}</span>
                          <Badge>{item.status === 'waiting' ? 'Aguardando' : item.status === 'preparing' ? 'Preparando' : item.status === 'ready' ? 'Pronta' : item.status === 'called' ? 'Chamada' : 'Entregue'}</Badge>
                        </div>
                        <div className="flex gap-2">
                          {item.status === 'waiting' && <Button size="sm" onClick={() => updateStatus.mutate({ id: item.id, status: 'preparing' })}>Preparando</Button>}
                          {item.status === 'preparing' && <Button size="sm" onClick={() => updateStatus.mutate({ id: item.id, status: 'ready' })}>Pronto</Button>}
                          {item.status === 'ready' && <Button size="sm" onClick={() => callPassword.mutate(item.id)}><Volume2 className="h-4 w-4 mr-1" />Chamar</Button>}
                          {(item.status === 'ready' || item.status === 'called') && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: item.id, status: 'delivered' })}><Check className="h-4 w-4 mr-1" />Entregue</Button>}
                        </div>
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
              <div className="flex items-center justify-between">
                <div><Label>Chamada por Voz</Label><p className="text-sm text-muted-foreground">Anunciar senha em voz alta</p></div>
                <Switch checked={config?.voice_enabled ?? false} onCheckedChange={(checked) => saveConfig.mutate({ voice_enabled: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Reiniciar Diariamente</Label><p className="text-sm text-muted-foreground">Zerar à meia-noite</p></div>
                <Switch checked={config?.reset_daily ?? true} onCheckedChange={(checked) => saveConfig.mutate({ reset_daily: checked })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
