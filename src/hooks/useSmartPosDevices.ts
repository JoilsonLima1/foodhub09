import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SmartPosDevice {
  id: string;
  tenant_id: string;
  name: string;
  platform: string;
  model: string | null;
  serial: string | null;
  status: string;
  last_seen_at: string | null;
  enabled: boolean;
  created_at: string;
}

export interface DeviceEvent {
  id: string;
  device_id: string;
  level: string;
  event_type: string;
  message: string | null;
  meta: any;
  created_at: string;
}

export function useSmartPosDevices() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const devicesQuery = useQuery({
    queryKey: ['smartpos-devices', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('tenant_devices')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('platform', 'smartpos')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SmartPosDevice[];
    },
    enabled: !!tenantId,
  });

  const toggleDevice = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('tenant_devices')
        .update({ enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartpos-devices'] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar dispositivo', variant: 'destructive' });
    },
  });

  const removeDevice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenant_devices')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartpos-devices'] });
      toast({ title: 'Dispositivo removido' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover dispositivo', variant: 'destructive' });
    },
  });

  const generatePairingCode = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');
      const { data, error } = await supabase.rpc('generate_pairing_code', {
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      return data as string;
    },
    onError: () => {
      toast({ title: 'Erro ao gerar código', variant: 'destructive' });
    },
  });

  const createTestPrintJob = useMutation({
    mutationFn: async (deviceId: string) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase.from('print_jobs').insert({
        tenant_id: tenantId,
        device_id: deviceId,
        source: 'system',
        job_type: 'TEST',
        payload: {
          version: 1,
          title: 'FoodHub09',
          job_type: 'TEST',
          target: { sector: null },
          lines: [
            { type: 'text', value: 'TESTE DE IMPRESSÃO', align: 'center', bold: true },
            { type: 'hr' },
            { type: 'text', value: `Dispositivo: ${deviceId.slice(0, 8)}...` },
            { type: 'text', value: `Data: ${new Date().toLocaleString('pt-BR')}` },
            { type: 'hr' },
            { type: 'text', value: 'Se você leu isto,', align: 'center' },
            { type: 'text', value: 'a impressão está OK!', align: 'center', bold: true },
            { type: 'cut' },
          ],
        },
        priority: 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Job de teste criado', description: 'A maquininha irá buscar e imprimir.' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar job de teste', variant: 'destructive' });
    },
  });

  const fetchDeviceEvents = async (deviceId: string): Promise<DeviceEvent[]> => {
    const { data, error } = await supabase
      .from('device_events')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data as DeviceEvent[];
  };

  return {
    devices: devicesQuery.data || [],
    isLoading: devicesQuery.isLoading,
    refetch: devicesQuery.refetch,
    toggleDevice,
    removeDevice,
    generatePairingCode,
    createTestPrintJob,
    fetchDeviceEvents,
  };
}
