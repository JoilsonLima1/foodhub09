import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { POSDisplayMode } from '@/components/pos/POSDisplayModeToggle';

interface POSSettings {
  displayMode: POSDisplayMode;
  allowCashierModeChange: boolean;
}

export function usePOSSettings() {
  const { tenantId } = useAuth();
  const [settings, setSettings] = useState<POSSettings>({
    displayMode: 'list',
    allowCashierModeChange: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('pos_display_mode, pos_allow_cashier_mode_change')
          .eq('id', tenantId)
          .single();

        if (error) throw error;

        if (data) {
          setSettings({
            displayMode: (data.pos_display_mode as POSDisplayMode) || 'list',
            allowCashierModeChange: data.pos_allow_cashier_mode_change || false,
          });
        }
      } catch (error) {
        console.error('Error fetching POS settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, [tenantId]);

  const updateDisplayMode = async (mode: POSDisplayMode) => {
    if (!tenantId) return;

    // Update local state immediately
    setSettings(prev => ({ ...prev, displayMode: mode }));

    // Persist to database
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ pos_display_mode: mode })
        .eq('id', tenantId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating display mode:', error);
      // Revert on error
      setSettings(prev => ({ ...prev, displayMode: settings.displayMode }));
    }
  };

  return {
    ...settings,
    isLoading,
    updateDisplayMode,
  };
}
