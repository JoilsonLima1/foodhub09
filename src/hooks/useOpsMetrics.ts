/**
 * useOpsMetrics - Hook for operational metrics and SLO/SLI data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OpsMetricsDaily {
  id: string;
  metric_date: string;
  provider: string | null;
  events_received: number;
  events_applied_ok: number;
  events_apply_error: number;
  duplicates_ignored: number;
  avg_apply_duration_ms: number | null;
  p95_apply_duration_ms: number | null;
  queue_lag_p95_seconds: number | null;
  reconciliation_mismatch_count: number;
  payout_failed_count: number;
  payout_success_count: number;
  disputes_opened_count: number;
  disputes_resolved_count: number;
  total_volume_processed: number;
  platform_revenue: number;
  partner_payouts_total: number;
  created_at: string;
}

export interface OpsBackofficeSummary {
  critical_alerts_open: number;
  total_alerts_open: number;
  reconciliation_mismatches: number;
  payouts_failed: number;
  payouts_pending: number;
  disputes_open: number;
  recommendations_pending: number;
  high_risk_fraud_flags: number;
  events_last_24h: number;
  events_last_hour: number;
}

export interface FeatureFlag {
  id: string;
  flag_key: string;
  enabled: boolean;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApplyQueueStats {
  queued: number;
  processing: number;
  failed: number;
  dead_letter: number;
  done_today: number;
}

export function useOpsMetrics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch daily metrics
  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['ops-metrics-daily'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as OpsMetricsDaily[];
    },
  });

  // Fetch backoffice summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['ops-backoffice-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_ops_backoffice_summary')
        .select('*')
        .single();

      if (error) throw error;
      return data as OpsBackofficeSummary;
    },
  });

  // Fetch feature flags
  const { data: featureFlags = [], isLoading: flagsLoading } = useQuery({
    queryKey: ['system-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_feature_flags')
        .select('*')
        .order('flag_key');

      if (error) throw error;
      return data as FeatureFlag[];
    },
  });

  // Fetch apply queue stats
  const { data: queueStats, isLoading: queueLoading } = useQuery({
    queryKey: ['apply-queue-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apply_queue')
        .select('status, created_at');

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const stats: ApplyQueueStats = {
        queued: 0,
        processing: 0,
        failed: 0,
        dead_letter: 0,
        done_today: 0,
      };

      (data || []).forEach((item: { status: string; created_at: string }) => {
        if (item.status === 'queued') stats.queued++;
        if (item.status === 'processing') stats.processing++;
        if (item.status === 'failed') stats.failed++;
        if (item.status === 'dead_letter') stats.dead_letter++;
        if (item.status === 'done' && item.created_at?.startsWith(today)) stats.done_today++;
      });

      return stats;
    },
  });

  // Toggle feature flag
  const toggleFlag = useMutation({
    mutationFn: async ({ flagKey, enabled }: { flagKey: string; enabled: boolean }) => {
      const { data, error } = await supabase.rpc('set_feature_flag', {
        p_flag_key: flagKey,
        p_enabled: enabled,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-feature-flags'] });
      toast({ title: 'Flag atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Run housekeeping
  const runHousekeeping = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('housekeeping_all', {
        p_archive_before_days: 90,
        p_log_retention_days: 30,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ops-metrics-daily'] });
      queryClient.invalidateQueries({ queryKey: ['ops-backoffice-summary'] });
      toast({ 
        title: 'Housekeeping concluído', 
        description: `Arquivados: ${(data as Record<string, unknown>)?.archive ? JSON.stringify((data as Record<string, unknown>).archive) : 'N/A'}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Compute metrics for a specific date
  const computeMetrics = useMutation({
    mutationFn: async (date: string) => {
      const { data, error } = await supabase.rpc('compute_ops_metrics', {
        p_date: date,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-metrics-daily'] });
      toast({ title: 'Métricas calculadas' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Process apply queue
  const processQueue = useMutation({
    mutationFn: async (batchSize: number = 10) => {
      const { data, error } = await supabase.rpc('process_apply_queue', {
        p_batch_size: batchSize,
        p_worker_id: 'manual-ui',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apply-queue-stats'] });
      const result = data as Record<string, unknown>;
      toast({ 
        title: 'Fila processada', 
        description: `Sucesso: ${result?.succeeded || 0}, Falha: ${result?.failed || 0}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  return {
    metrics,
    summary,
    featureFlags,
    queueStats,
    isLoading: metricsLoading || summaryLoading || flagsLoading || queueLoading,
    toggleFlag,
    runHousekeeping,
    computeMetrics,
    processQueue,
  };
}
