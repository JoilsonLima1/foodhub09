import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface SMSConfig {
  id: string;
  tenant_id: string;
  provider: string;
  sender_id: string | null;
  is_active: boolean;
  monthly_limit: number;
  messages_sent_this_month: number;
  config: Record<string, any>;
}

export interface SMSCampaign {
  id: string;
  tenant_id: string;
  name: string;
  message_template: string;
  target_audience: string;
  target_filter: Record<string, any>;
  scheduled_at: string | null;
  sent_at: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  created_at: string;
}

export interface SMSMessage {
  id: string;
  campaign_id: string | null;
  phone_number: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export function useSMSMarketing() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['sms-config', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as SMSConfig | null;
    },
    enabled: !!tenantId,
  });

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['sms-campaigns', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as SMSCampaign[];
    },
    enabled: !!tenantId,
  });

  // Stats
  const stats = {
    totalCampaigns: campaigns.length,
    messagesSent: config?.messages_sent_this_month || 0,
    messagesRemaining: (config?.monthly_limit || 0) - (config?.messages_sent_this_month || 0),
    deliveryRate: campaigns.reduce((sum, c) => sum + c.messages_delivered, 0) / 
      Math.max(1, campaigns.reduce((sum, c) => sum + c.messages_sent, 0)) * 100,
  };

  // Save config
  const saveConfig = useMutation({
    mutationFn: async (newConfig: Partial<SMSConfig> & { api_key?: string; api_secret?: string }) => {
      const { error } = await supabase
        .from('sms_config')
        .upsert({
          tenant_id: tenantId,
          ...newConfig,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-config'] });
      toast.success('Configurações salvas');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  // Create campaign
  const createCampaign = useMutation({
    mutationFn: async (campaign: {
      name: string;
      message_template: string;
      target_audience: string;
      target_filter?: Record<string, any>;
      scheduled_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('sms_campaigns')
        .insert({
          tenant_id: tenantId,
          ...campaign,
          status: campaign.scheduled_at ? 'scheduled' : 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
      toast.success('Campanha criada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar: ' + error.message);
    },
  });

  // Send campaign
  const sendCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('sms-sender', {
        body: { action: 'send_campaign', campaignId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
      toast.success('Campanha enviada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar: ' + error.message);
    },
  });

  // Cancel campaign
  const cancelCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('sms_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
      toast.success('Campanha cancelada');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    config,
    campaigns,
    stats,
    isLoading: configLoading || campaignsLoading,
    saveConfig,
    createCampaign,
    sendCampaign,
    cancelCampaign,
  };
}
