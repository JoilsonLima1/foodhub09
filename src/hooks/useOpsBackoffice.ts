import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types for Phase 8 Ops - aligned with actual DB schema
export interface OpsRecommendation {
  id: string;
  type: string;
  provider: string;
  provider_payment_id: string | null;
  tenant_id: string | null;
  partner_id: string | null;
  suggested_action: string;
  payload: Record<string, unknown>;
  status: string;
  applied_at: string | null;
  applied_by: string | null;
  error_message: string | null;
  dedupe_key: string;
  created_at: string;
  updated_at: string;
}

export interface Dispute {
  id: string;
  provider: string;
  provider_payment_id: string;
  tenant_id: string | null;
  partner_id: string | null;
  dispute_type: string;
  status: string;
  amount: number | null;
  currency: string;
  opened_at: string;
  updated_at: string;
  evidence_deadline_at: string | null;
  resolved_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  source_event_id: string | null;
  dedupe_key: string;
  created_at: string;
}

export interface DisputeTimeline {
  id: string;
  dispute_id: string;
  action: string;
  actor_type: string;
  actor_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

// Actual schema: type, severity, partner_id, tenant_id, status, title, details, idempotency_key, acknowledged_at, acknowledged_by, resolved_at, resolved_by, resolution_notes, dedupe_key
export interface OperationalAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  details: Record<string, unknown> | null;
  tenant_id: string | null;
  partner_id: string | null;
  status: string;
  idempotency_key: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  dedupe_key: string | null;
  created_at: string;
  updated_at: string;
}

// Actual schema: provider, provider_payment_id, internal_event_id, expected_amount, provider_amount, difference, status, checked_at, resolved_at, resolution_notes, metadata
export interface FinancialReconciliation {
  id: string;
  provider: string;
  provider_payment_id: string;
  internal_event_id: string | null;
  expected_amount: number | null;
  provider_amount: number | null;
  difference: number | null;
  status: string;
  checked_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Hook for Operational Alerts
export function useOperationalAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ['ops-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as unknown as OperationalAlert[];
    },
  });

  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('operational_alerts')
        .update({ 
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString() 
        })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-alerts'] });
      toast({ title: 'Alerta reconhecido' });
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('operational_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-alerts'] });
      toast({ title: 'Alerta resolvido' });
    },
  });

  return {
    alerts: alertsQuery.data ?? [],
    isLoading: alertsQuery.isLoading,
    acknowledgeAlert,
    resolveAlert,
  };
}

// Hook for Recommendations
export function useOpsRecommendations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const recommendationsQuery = useQuery({
    queryKey: ['ops-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_recommendations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as unknown as OpsRecommendation[];
    },
  });

  const applyRecommendation = useMutation({
    mutationFn: async (recommendationId: string) => {
      const { data, error } = await supabase.rpc('apply_ops_recommendation', {
        p_recommendation_id: recommendationId,
      });
      
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ops-recommendations'] });
      if (data?.success) {
        toast({ title: 'Recomendação aplicada com sucesso' });
      } else {
        toast({ title: 'Erro ao aplicar', description: String(data?.error || 'Erro desconhecido'), variant: 'destructive' });
      }
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const dismissRecommendation = useMutation({
    mutationFn: async (recommendationId: string) => {
      const { error } = await supabase
        .from('ops_recommendations')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', recommendationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-recommendations'] });
      toast({ title: 'Recomendação descartada' });
    },
  });

  const generateRecommendations = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_ops_recommendations');
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['ops-recommendations'] });
      toast({ title: `${count} recomendações geradas` });
    },
  });

  return {
    recommendations: recommendationsQuery.data ?? [],
    isLoading: recommendationsQuery.isLoading,
    applyRecommendation,
    dismissRecommendation,
    generateRecommendations,
  };
}

// Hook for Disputes
export function useDisputes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const disputesQuery = useQuery({
    queryKey: ['ops-disputes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as unknown as Dispute[];
    },
  });

  const getDisputeTimeline = async (disputeId: string) => {
    const { data, error } = await supabase
      .from('dispute_timeline')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data as unknown as DisputeTimeline[];
  };

  const updateDisputeStatus = useMutation({
    mutationFn: async ({ disputeId, newStatus, notes }: { 
      disputeId: string; 
      newStatus: string; 
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('update_dispute_status', {
        p_dispute_id: disputeId,
        p_new_status: newStatus,
        p_notes: notes,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-disputes'] });
      toast({ title: 'Status atualizado' });
    },
  });

  return {
    disputes: disputesQuery.data ?? [],
    isLoading: disputesQuery.isLoading,
    getDisputeTimeline,
    updateDisputeStatus,
  };
}

// Hook for Reconciliation
export function useReconciliation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reconciliationQuery = useQuery({
    queryKey: ['ops-reconciliation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_reconciliation')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as unknown as FinancialReconciliation[];
    },
  });

  const runReconciliation = useMutation({
    mutationFn: async (params?: {
      partnerId?: string;
      tenantId?: string;
      periodStart?: string;
      periodEnd?: string;
    }) => {
      const { data, error } = await supabase.rpc('reconcile_provider_payments_v2', {
        p_partner_id: params?.partnerId,
        p_tenant_id: params?.tenantId,
        p_period_start: params?.periodStart,
        p_period_end: params?.periodEnd,
      });
      
      if (error) throw error;
      return data as unknown[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ops-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['ops-recommendations'] });
      toast({ 
        title: 'Reconciliação concluída', 
        description: `${data?.length || 0} divergências encontradas` 
      });
    },
  });

  return {
    reconciliations: reconciliationQuery.data ?? [],
    isLoading: reconciliationQuery.isLoading,
    runReconciliation,
  };
}

// Hook for Payment Events Search
export function usePaymentEventsSearch() {
  const searchPaymentEvent = async (providerPaymentId: string) => {
    const { data: events, error: eventsError } = await supabase
      .from('payment_events')
      .select('*')
      .eq('provider_payment_id', providerPaymentId)
      .order('created_at', { ascending: false });
    
    if (eventsError) throw eventsError;

    if (events && events.length > 0) {
      const eventIds = events.map(e => e.id);
      const { data: effects, error: effectsError } = await supabase
        .from('transaction_effects')
        .select('*')
        .in('source_event_id', eventIds);
      
      if (effectsError) throw effectsError;
      
      return { events, effects: effects || [] };
    }
    
    return { events: events || [], effects: [] };
  };

  return { searchPaymentEvent };
}

// Hook for Log Rotation
export function useLogRotation() {
  const { toast } = useToast();

  const rotateLogs = useMutation({
    mutationFn: async (params?: { retentionDays?: number; archiveDays?: number }) => {
      const { data, error } = await supabase.rpc('rotate_logs', {
        p_retention_days: params?.retentionDays ?? 30,
        p_archive_days: params?.archiveDays ?? 90,
      });
      
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
    onSuccess: (data) => {
      const opArchived = data?.operational_logs_archived ?? 0;
      const auditArchived = data?.audit_logs_archived ?? 0;
      toast({ 
        title: 'Rotação de logs concluída',
        description: `Arquivados: ${opArchived} operacionais, ${auditArchived} de auditoria`
      });
    },
  });

  return { rotateLogs };
}
