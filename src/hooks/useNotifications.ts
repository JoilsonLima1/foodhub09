import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePartner } from '@/contexts/PartnerContext';

// ==================== Types ====================

export type NotificationChannel = 'email' | 'whatsapp' | 'inapp' | 'sms';

export interface NotificationTemplate {
  id: string;
  partner_id: string | null;
  channel: NotificationChannel;
  template_key: string;
  subject: string | null;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationOutboxItem {
  id: string;
  tenant_id: string | null;
  partner_id: string | null;
  invoice_id: string | null;
  event_id: string | null;
  channel: NotificationChannel;
  template_key: string;
  to_address: string;
  payload: Record<string, unknown>;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'dead';
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
  correlation_id: string;
  dedupe_key: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationDelivery {
  id: string;
  outbox_id: string;
  provider: string;
  provider_message_id: string | null;
  status: 'accepted' | 'delivered' | 'bounced' | 'complained' | 'failed';
  raw: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TemplatePreview {
  template_id: string;
  is_default: boolean;
  subject: string;
  body: string;
  rendered_subject: string;
  rendered_body: string;
}

// ==================== Hook: useNotificationTemplates ====================

export function useNotificationTemplates(partnerId?: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { partner } = usePartner();
  const effectivePartnerId = partnerId ?? partner?.id ?? null;

  // Fetch templates for this partner (or platform defaults)
  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['notification-templates', effectivePartnerId],
    queryFn: async () => {
      let query = supabase
        .from('notification_templates')
        .select('*')
        .order('template_key');

      if (effectivePartnerId) {
        // Partner templates + platform defaults
        query = query.or(`partner_id.eq.${effectivePartnerId},partner_id.is.null`);
      } else {
        // Platform defaults only
        query = query.is('partner_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });

  // Upsert template
  const upsertTemplate = useMutation({
    mutationFn: async (input: {
      channel: NotificationChannel;
      template_key: string;
      subject?: string;
      body: string;
      is_active?: boolean;
      variables?: string[];
    }) => {
      const { data, error } = await supabase.rpc('upsert_notification_template', {
        p_partner_id: effectivePartnerId,
        p_channel: input.channel,
        p_template_key: input.template_key,
        p_subject: input.subject || null,
        p_body: input.body,
        p_is_active: input.is_active ?? true,
        p_variables: input.variables || [],
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast({ title: 'Template salvo', description: 'O template foi atualizado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  // Preview template
  const previewTemplate = async (
    templateKey: string,
    channel: NotificationChannel = 'email',
    payload: Record<string, string> = {}
  ): Promise<TemplatePreview | null> => {
    const { data, error } = await supabase.rpc('preview_notification', {
      p_partner_id: effectivePartnerId,
      p_channel: channel,
      p_template_key: templateKey,
      p_payload: payload,
    });

    if (error) {
      toast({ title: 'Erro no preview', description: error.message, variant: 'destructive' });
      return null;
    }

    return data?.[0] as TemplatePreview | null;
  };

  // Group templates by key (partner override vs default)
  const groupedTemplates = templates.reduce((acc, t) => {
    if (!acc[t.template_key]) {
      acc[t.template_key] = { default: null, partner: null };
    }
    if (t.partner_id === null) {
      acc[t.template_key].default = t;
    } else {
      acc[t.template_key].partner = t;
    }
    return acc;
  }, {} as Record<string, { default: NotificationTemplate | null; partner: NotificationTemplate | null }>);

  return {
    templates,
    groupedTemplates,
    isLoading,
    refetch,
    upsertTemplate,
    previewTemplate,
    partnerId: effectivePartnerId,
  };
}

// ==================== Hook: useNotificationOutbox ====================

export function useNotificationOutbox(filters?: {
  status?: NotificationOutboxItem['status'];
  partnerId?: string;
  limit?: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: outbox = [], isLoading, refetch } = useQuery({
    queryKey: ['notification-outbox', filters],
    queryFn: async () => {
      let query = supabase
        .from('notification_outbox')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit ?? 100);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.partnerId) {
        query = query.eq('partner_id', filters.partnerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NotificationOutboxItem[];
    },
  });

  // Requeue dead notification
  const requeueDead = useMutation({
    mutationFn: async (outboxId: string) => {
      const { data, error } = await supabase.rpc('requeue_dead_notification', {
        p_outbox_id: outboxId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-outbox'] });
      toast({ title: 'Reenfileirado', description: 'A notificação foi colocada na fila novamente.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Process outbox (trigger batch processing)
  const processOutbox = useMutation({
    mutationFn: async (batchSize: number = 50) => {
      const { data, error } = await supabase.rpc('process_notification_outbox', {
        p_batch_size: batchSize,
      });
      if (error) throw error;
      return data?.[0] as { processed: number; sent: number; failed: number; dead: number } | undefined;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notification-outbox'] });
      if (data) {
        toast({
          title: 'Processamento concluído',
          description: `Processados: ${data.processed}, Enviados: ${data.sent}, Falhas: ${data.failed}, Dead: ${data.dead}`,
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Erro no processamento', description: error.message, variant: 'destructive' });
    },
  });

  // Stats
  const stats = {
    total: outbox.length,
    queued: outbox.filter(o => o.status === 'queued').length,
    sending: outbox.filter(o => o.status === 'sending').length,
    sent: outbox.filter(o => o.status === 'sent').length,
    failed: outbox.filter(o => o.status === 'failed').length,
    dead: outbox.filter(o => o.status === 'dead').length,
  };

  return {
    outbox,
    stats,
    isLoading,
    refetch,
    requeueDead,
    processOutbox,
  };
}

// ==================== Hook: useNotificationDeliveries ====================

export function useNotificationDeliveries(outboxId?: string) {
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['notification-deliveries', outboxId],
    queryFn: async () => {
      let query = supabase
        .from('notification_delivery')
        .select('*')
        .order('created_at', { ascending: false });

      if (outboxId) {
        query = query.eq('outbox_id', outboxId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as NotificationDelivery[];
    },
    enabled: !!outboxId || outboxId === undefined,
  });

  return { deliveries, isLoading };
}

// ==================== Hook: useBillingNotificationEmitter ====================

export function useBillingNotificationEmitter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const emitBillingNotifications = useMutation({
    mutationFn: async (params?: { dateFrom?: string; dateTo?: string }) => {
      const { data, error } = await supabase.rpc('emit_billing_notifications', {
        p_date_from: params?.dateFrom || new Date(Date.now() - 86400000).toISOString().split('T')[0],
        p_date_to: params?.dateTo || new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
      return data?.[0] as { enqueued: number; skipped: number } | undefined;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notification-outbox'] });
      if (data) {
        toast({
          title: 'Notificações emitidas',
          description: `Enfileiradas: ${data.enqueued}, Ignoradas: ${data.skipped}`,
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao emitir', description: error.message, variant: 'destructive' });
    },
  });

  return { emitBillingNotifications };
}
