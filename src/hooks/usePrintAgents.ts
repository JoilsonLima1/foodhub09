import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface PrintAgent {
  id: string;
  tenant_id: string;
  device_id: string;
  device_name: string | null;
  paired_at: string | null;
  last_seen_at: string | null;
  status: string;
  agent_version: string | null;
}

export function usePrintAgents() {
  const { tenantId } = useAuth();
  const [agents, setAgents] = useState<PrintAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pairingToken, setPairingToken] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState(false);

  const fetchAgents = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('tenant_print_agents')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'pairing')
        .order('paired_at', { ascending: false });

      if (error) throw error;
      setAgents((data || []) as PrintAgent[]);
    } catch (err) {
      console.error('Failed to fetch print agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('print-agents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_print_agents',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchAgents]);

  const startPairing = useCallback(async () => {
    setIsPairing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await supabase.functions.invoke('print-agent/pair', {
        method: 'POST',
        body: {},
      });

      if (resp.error) throw resp.error;
      setPairingToken(resp.data.token);
      return resp.data.token;
    } catch (err) {
      console.error('Failed to start pairing:', err);
      return null;
    } finally {
      setIsPairing(false);
    }
  }, []);

  const cancelPairing = useCallback(() => {
    setPairingToken(null);
  }, []);

  const removeAgent = useCallback(async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('tenant_print_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;
      setAgents(prev => prev.filter(a => a.id !== agentId));
    } catch (err) {
      console.error('Failed to remove agent:', err);
    }
  }, []);

  return {
    agents,
    isLoading,
    pairingToken,
    isPairing,
    startPairing,
    cancelPairing,
    removeAgent,
    refetch: fetchAgents,
  };
}
