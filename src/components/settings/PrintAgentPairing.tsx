import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Monitor, Wifi, WifiOff, Trash2, Plus, Loader2, Copy, CheckCircle,
} from 'lucide-react';
import { usePrintAgents, type PrintAgent } from '@/hooks/usePrintAgents';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function AgentStatusBadge({ status }: { status: string }) {
  if (status === 'online') {
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"><Wifi className="h-3 w-3 mr-1" /> Online</Badge>;
  }
  if (status === 'error') {
    return <Badge variant="destructive"><WifiOff className="h-3 w-3 mr-1" /> Erro</Badge>;
  }
  return <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" /> Offline</Badge>;
}

function AgentCard({ agent, onRemove }: { agent: PrintAgent; onRemove: () => void }) {
  const lastSeen = agent.last_seen_at
    ? formatDistanceToNow(new Date(agent.last_seen_at), { addSuffix: true, locale: ptBR })
    : 'nunca';

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <Monitor className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{agent.device_name || agent.device_id}</span>
            <AgentStatusBadge status={agent.status} />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {agent.agent_version && <span>v{agent.agent_version} • </span>}
            Último contato: {lastSeen}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function PrintAgentPairing() {
  const { toast } = useToast();
  const { agents, isLoading, pairingToken, isPairing, startPairing, cancelPairing, removeAgent } = usePrintAgents();
  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    if (!pairingToken) return;
    navigator.clipboard.writeText(pairingToken);
    setCopied(true);
    toast({ title: 'Código copiado!' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Monitor className="h-4 w-4" />
          Dispositivos Pareados
        </CardTitle>
        <CardDescription>
          Computadores com o FoodHub Print Agent instalado e conectados a este estabelecimento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Paired agents list */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Nenhum dispositivo pareado. Clique em "Conectar Agent" para parear.
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onRemove={() => removeAgent(agent.id)}
              />
            ))}
          </div>
        )}

        {/* Pairing flow */}
        {pairingToken ? (
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
            <p className="text-sm font-medium">Código de Pareamento</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-center text-2xl font-mono font-bold tracking-[0.3em] bg-background rounded-lg py-3 border">
                {pairingToken}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopyToken}>
                {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Insira este código no FoodHub Print Agent instalado no computador. Expira em 10 minutos.
            </p>
            <Button variant="outline" size="sm" onClick={cancelPairing}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={startPairing} disabled={isPairing}>
            {isPairing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Conectar Print Agent
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
