import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DesktopPdvUrls {
  windows_url: string;
  mac_url: string;
  default_port: number;
}

const DEFAULTS: DesktopPdvUrls = {
  windows_url: '#',
  mac_url: '#',
  default_port: 8123,
};

export function useDesktopPdvSettings() {
  const [data, setData] = useState<DesktopPdvUrls>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: rows, error } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'desktop_pdv_windows_url',
            'desktop_pdv_mac_url',
            'desktop_pdv_default_port',
          ]);

        if (error) throw error;

        const result = { ...DEFAULTS };
        for (const row of rows || []) {
          const val = row.setting_value as unknown;
          if (row.setting_key === 'desktop_pdv_windows_url' && typeof val === 'string') {
            result.windows_url = val;
          } else if (row.setting_key === 'desktop_pdv_mac_url' && typeof val === 'string') {
            result.mac_url = val;
          } else if (row.setting_key === 'desktop_pdv_default_port') {
            result.default_port = Number(val) || 8123;
          }
        }
        setData(result);
      } catch (err) {
        console.error('Failed to load desktop PDV settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return { data, isLoading };
}
