/**
 * PartnerPlanApprovalManager - Super Admin tab to approve/reject partner plans
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, Loader2, Eye, Clock, ShieldCheck, ShieldX, Filter } from 'lucide-react';

interface PlanWithPartner {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  is_free: boolean;
  is_active: boolean;
  trial_days: number | null;
  included_modules: string[] | null;
  included_features: string[] | null;
  approval_status: string;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  partner_id: string;
  partners: { id: string; name: string; slug: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  draft: { label: 'Rascunho', variant: 'outline', icon: Eye },
  pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
  approved: { label: 'Aprovado', variant: 'default', icon: ShieldCheck },
  rejected: { label: 'Rejeitado', variant: 'destructive', icon: ShieldX },
};

export function PartnerPlanApprovalManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [rejectDialog, setRejectDialog] = useState<{ planId: string; planName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [detailPlan, setDetailPlan] = useState<PlanWithPartner | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['all-partner-plans', statusFilter],
    queryFn: async () => {
      const baseQuery = supabase
        .from('partner_plans')
        .select('*, partners!partner_plans_partner_id_fkey(id, name, slug)')
        .order('created_at', { ascending: false });

      const finalQuery = statusFilter !== 'all'
        ? baseQuery.eq('approval_status', statusFilter as any)
        : baseQuery;

      const { data, error } = await finalQuery;
      if (error) throw error;
      return (data || []) as PlanWithPartner[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('partner_plans')
        .update({ approval_status: 'approved' } as any)
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-partner-plans'] });
      toast({ title: 'Plano aprovado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ planId, reason }: { planId: string; reason: string }) => {
      const { error } = await supabase
        .from('partner_plans')
        .update({ approval_status: 'rejected', rejection_reason: reason } as any)
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-partner-plans'] });
      toast({ title: 'Plano rejeitado' });
      setRejectDialog(null);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const pendingCount = plans.filter(p => p.approval_status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Aprovação de Planos
          </h2>
          <p className="text-muted-foreground">
            Revise e aprove planos criados pelos parceiros antes da publicação
          </p>
        </div>
        {statusFilter === 'all' && pendingCount > 0 && (
          <Badge variant="secondary">{pendingCount} pendente(s)</Badge>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum plano encontrado com este filtro.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead>Módulos/Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  const config = STATUS_CONFIG[plan.approval_status] || STATUS_CONFIG.pending;
                  const Icon = config.icon;
                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <span className="font-medium text-sm">{plan.partners?.name || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">{plan.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.is_free ? (
                          <Badge variant="secondary">Grátis</Badge>
                        ) : (
                          <span className="text-sm font-medium">R$ {Number(plan.monthly_price).toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{plan.trial_days || 0} dias</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {plan.included_modules?.length || 0}M • {plan.included_features?.length || 0}F
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                        {plan.rejection_reason && (
                          <p className="text-xs text-destructive mt-1 max-w-[150px] truncate" title={plan.rejection_reason}>
                            {plan.rejection_reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setDetailPlan(plan)} title="Detalhes">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(plan.approval_status === 'pending' || plan.approval_status === 'draft') && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-primary hover:text-primary/80"
                                onClick={() => approveMutation.mutate(plan.id)}
                                disabled={approveMutation.isPending}
                                title="Aprovar"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setRejectDialog({ planId: plan.id, planName: plan.name })}
                                title="Rejeitar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {plan.approval_status === 'rejected' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:text-primary/80"
                              onClick={() => approveMutation.mutate(plan.id)}
                              disabled={approveMutation.isPending}
                              title="Aprovar"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Plano: {rejectDialog?.planName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo da Rejeição *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explique o motivo para o parceiro..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => rejectDialog && rejectMutation.mutate({ planId: rejectDialog.planId, reason: rejectionReason })}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailPlan} onOpenChange={() => setDetailPlan(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailPlan?.name}</DialogTitle>
          </DialogHeader>
          {detailPlan && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Parceiro</Label><p>{detailPlan.partners?.name}</p></div>
                <div><Label>Slug</Label><p>{detailPlan.slug}</p></div>
                <div><Label>Preço</Label><p>{detailPlan.is_free ? 'Grátis' : `R$ ${Number(detailPlan.monthly_price).toFixed(2)}`}</p></div>
                <div><Label>Trial</Label><p>{detailPlan.trial_days || 0} dias</p></div>
              </div>
              {detailPlan.included_modules && detailPlan.included_modules.length > 0 && (
                <div>
                  <Label>Módulos</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {detailPlan.included_modules.map(m => <Badge key={m} variant="outline">{m}</Badge>)}
                  </div>
                </div>
              )}
              {detailPlan.included_features && detailPlan.included_features.length > 0 && (
                <div>
                  <Label>Features</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {detailPlan.included_features.map(f => <Badge key={f} variant="outline">{f}</Badge>)}
                  </div>
                </div>
              )}
              {detailPlan.rejection_reason && (
                <div>
                  <Label>Motivo da Rejeição</Label>
                  <p className="text-destructive">{detailPlan.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
