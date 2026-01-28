import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface StoreSettings {
  name: string;
  phone: string;
  email: string;
  whatsapp_number: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

const defaultSettings: StoreSettings = {
  name: '',
  phone: '',
  email: '',
  whatsapp_number: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
};

export function useStoreSettings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const tenantId = profile?.tenant_id;

  const fetchSettings = useCallback(async () => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('name, phone, email, whatsapp_number, address, city, state, zip_code')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          whatsapp_number: data.whatsapp_number || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
        });
      }
    } catch (error: any) {
      console.error('[useStoreSettings] Error fetching:', error);
      toast({
        title: 'Erro ao carregar configurações',
        description: error?.message || 'Não foi possível carregar as configurações da loja',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    if (!tenantId) {
      toast({
        title: 'Erro',
        description: 'Tenant não encontrado',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('tenants')
        .update({
          name: newSettings.name,
          phone: newSettings.phone,
          email: newSettings.email,
          whatsapp_number: newSettings.whatsapp_number,
          address: newSettings.address,
          city: newSettings.city,
          state: newSettings.state,
          zip_code: newSettings.zip_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId);

      if (error) throw error;

      setSettings((prev) => ({ ...prev, ...newSettings }));

      toast({
        title: 'Sucesso',
        description: 'Configurações da loja salvas com sucesso',
      });

      return true;
    } catch (error: any) {
      console.error('[useStoreSettings] Error saving:', error);
      toast({
        title: 'Erro ao salvar',
        description: error?.message || 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    setSettings,
    isLoading,
    isSaving,
    updateSettings,
    refetch: fetchSettings,
  };
}
