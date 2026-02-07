/**
 * GrowthRulesPanel - Gestão de regras de upsell e soft limits
 * 
 * Permite configurar:
 * - Regras de upsell/cross-sell
 * - Soft limits por plano
 * - Eventos de trial
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  Plus,
  Loader2,
  Zap,
  AlertTriangle,
  Target,
  Percent,
  Edit,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UpsellRule {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  trigger_condition: Record<string, unknown>;
  target_audience: string;
  offer_type: string;
  offer_config: Record<string, unknown>;
  display_type: string;
  priority: number;
  max_displays: number;
  cooldown_hours: number;
  is_active: boolean;
  created_at: string;
}

interface SoftLimit {
  id: string;
  plan_id: string;
  feature_key: string;
  warn_threshold: number;
  soft_limit_threshold: number;
  hard_limit_threshold: number;
  warn_action: string;
  soft_limit_action: string;
  hard_limit_action: string;
  grace_period_hours: number;
  is_active: boolean;
}

interface TrialEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  feature_key: string;
  usage_count: number;
  limit_value: number;
  percentage_used: number;
  created_at: string;
}

export function GrowthRulesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<UpsellRule | null>(null);

  // Fetch upsell rules
  const { data: upsellRules = [], isLoading: loadingRules } = useQuery({
    queryKey: ['upsell-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upsell_rules')
        .select('*')
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return (data || []) as UpsellRule[];
    },
  });

  // Fetch soft limits
  const { data: softLimits = [], isLoading: loadingLimits } = useQuery({
    queryKey: ['usage-soft-limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usage_soft_limits')
        .select('*')
        .order('feature_key');
      
      if (error) throw error;
      return (data || []) as SoftLimit[];
    },
  });

  // Fetch trial events
  const { data: trialEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['trial-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trial_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as TrialEvent[];
    },
  });

  // Toggle rule active status
  const toggleRule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('upsell_rules')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upsell-rules'] });
      toast({ title: 'Regra atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Stats
  const activeRules = upsellRules.filter(r => r.is_active).length;
  const activeLimits = softLimits.filter(l => l.is_active).length;
  const recentEvents = trialEvents.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Growth & Monetização
          </h2>
          <p className="text-sm text-muted-foreground">
            Regras de upsell, limites e eventos de trial
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Regras Ativas</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRules}</div>
            <p className="text-xs text-muted-foreground">
              de {upsellRules.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Limites Ativos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLimits}</div>
            <p className="text-xs text-muted-foreground">
              soft limits configurados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eventos Trial (24h)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentEvents}</div>
            <p className="text-xs text-muted-foreground">
              eventos registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upsell" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upsell">Regras de Upsell</TabsTrigger>
          <TabsTrigger value="limits">Soft Limits</TabsTrigger>
          <TabsTrigger value="events">Eventos de Trial</TabsTrigger>
        </TabsList>

        <TabsContent value="upsell">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Regras de Upsell</CardTitle>
                <CardDescription>
                  Configure gatilhos para ofertas de upgrade
                </CardDescription>
              </div>
              <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Regra
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRule ? 'Editar Regra' : 'Nova Regra de Upsell'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure quando e como exibir ofertas de upgrade
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input placeholder="Nome da regra" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Gatilho</Label>
                      <Select defaultValue="usage_threshold">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usage_threshold">Limite de Uso</SelectItem>
                          <SelectItem value="feature_attempt">Tentativa de Recurso</SelectItem>
                          <SelectItem value="time_based">Baseado em Tempo</SelectItem>
                          <SelectItem value="behavior">Comportamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Oferta</Label>
                      <Select defaultValue="upgrade">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upgrade">Upgrade de Plano</SelectItem>
                          <SelectItem value="addon">Add-on</SelectItem>
                          <SelectItem value="coupon">Cupom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingRules ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Gatilho</TableHead>
                      <TableHead>Oferta</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upsellRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">
                          {rule.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.trigger_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{rule.offer_type}</Badge>
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked) =>
                              toggleRule.mutate({ id: rule.id, isActive: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingRule(rule);
                              setIsRuleDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {upsellRules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma regra configurada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits">
          <Card>
            <CardHeader>
              <CardTitle>Soft Limits</CardTitle>
              <CardDescription>
                Limites de uso com avisos e bloqueios progressivos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLimits ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Aviso</TableHead>
                      <TableHead>Soft Limit</TableHead>
                      <TableHead>Hard Limit</TableHead>
                      <TableHead>Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {softLimits.map((limit) => (
                      <TableRow key={limit.id}>
                        <TableCell className="font-medium">
                          {limit.feature_key}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            {limit.warn_threshold}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            {limit.soft_limit_threshold}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            {limit.hard_limit_threshold}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {limit.is_active ? (
                            <Badge>Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {softLimits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum limite configurado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Eventos de Trial</CardTitle>
              <CardDescription>
                Atividade recente de usuários em trial
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Feature</TableHead>
                      <TableHead>Uso</TableHead>
                      <TableHead>% Usado</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          <Badge variant="outline">{event.event_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {event.feature_key || '-'}
                        </TableCell>
                        <TableCell>
                          {event.usage_count || 0} / {event.limit_value || '∞'}
                        </TableCell>
                        <TableCell>
                          {event.percentage_used ? (
                            <span className={
                              event.percentage_used >= 100 ? 'text-red-500' :
                              event.percentage_used >= 80 ? 'text-amber-500' : ''
                            }>
                              {event.percentage_used.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(event.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {trialEvents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum evento registrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
