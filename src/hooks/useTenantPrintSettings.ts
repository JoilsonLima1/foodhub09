import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TenantPrintSettings {
  tenant_id: string;
  paper_width: '58' | '80';
  printer_profile: 'EPSON' | 'ELGIN' | 'BEMATECH' | 'DARUMA' | 'TOMATE' | 'GENERIC';
  print_mode: 'BROWSER' | 'AGENT' | 'KIOSK';
  agent_endpoint: string | null;
  default_printer_name: string | null;
  kitchen_printer_name: string | null;
  bar_printer_name: string | null;
  updated_at: string;
}

const CACHE_KEY_PREFIX = 'printSettings:';

function getCacheKey(tenantId: string) {
  return `${CACHE_KEY_PREFIX}${tenantId}`;
}

function loadFromCache(tenantId: string): TenantPrintSettings | null {
  try {
    const cached = localStorage.getItem(getCacheKey(tenantId));
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function saveToCache(settings: TenantPrintSettings) {
  try {
    localStorage.setItem(getCacheKey(settings.tenant_id), JSON.stringify(settings));
  } catch {}
}

const defaultSettings = (tenantId: string): TenantPrintSettings => ({
  tenant_id: tenantId,
  paper_width: '80',
  printer_profile: 'GENERIC',
  print_mode: 'BROWSER',
  agent_endpoint: null,
  default_printer_name: null,
  kitchen_printer_name: null,
  bar_printer_name: null,
  updated_at: new Date().toISOString(),
});

export function useTenantPrintSettings() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<TenantPrintSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Load settings from DB with localStorage fallback
  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        const { data, error } = await supabase
          .rpc('get_or_create_tenant_print_settings', { p_tenant_id: tenantId });

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          const s = row as TenantPrintSettings;
          setSettings(s);
          saveToCache(s);
          setIsOffline(false);
        }
      } catch (err) {
        console.error('Failed to load print settings from DB:', err);
        // Fallback to localStorage
        const cached = loadFromCache(tenantId!);
        if (cached) {
          setSettings(cached);
        } else {
          setSettings(defaultSettings(tenantId!));
        }
        setIsOffline(true);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [tenantId]);

  const save = useCallback(async (updated: Partial<TenantPrintSettings>) => {
    if (!tenantId || !settings) return;

    const newSettings = { ...settings, ...updated, updated_at: new Date().toISOString() };
    setSettings(newSettings);
    saveToCache(newSettings);
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('tenant_print_settings')
        .upsert({
          tenant_id: tenantId,
          paper_width: newSettings.paper_width,
          printer_profile: newSettings.printer_profile,
          print_mode: newSettings.print_mode,
          agent_endpoint: newSettings.agent_endpoint,
          default_printer_name: newSettings.default_printer_name,
          kitchen_printer_name: newSettings.kitchen_printer_name,
          bar_printer_name: newSettings.bar_printer_name,
        }, { onConflict: 'tenant_id' });

      if (error) throw error;

      setIsOffline(false);
      toast({
        title: 'Configurações salvas',
        description: `Impressora configurada para papel ${newSettings.paper_width}mm.`,
      });
    } catch (err) {
      console.error('Failed to save print settings:', err);
      setIsOffline(true);
      toast({
        title: 'Salvo localmente',
        description: 'Sem sincronização no momento. As configurações foram salvas apenas neste dispositivo.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [tenantId, settings, toast]);

  // Test agent connection
  const testAgent = useCallback(async (endpoint: string): Promise<boolean> => {
    try {
      const resp = await fetch(`${endpoint}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }, []);

  // Print via agent
  const printViaAgent = useCallback(async (html: string): Promise<boolean> => {
    if (!settings || settings.print_mode !== 'AGENT' || !settings.agent_endpoint) return false;

    try {
      const resp = await fetch(`${settings.agent_endpoint}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: settings.tenant_id,
          paperWidth: settings.paper_width,
          profile: settings.printer_profile,
          html,
          cut: true,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!resp.ok) throw new Error('Agent print failed');
      return true;
    } catch (err) {
      console.error('Agent print failed, falling back to browser:', err);
      toast({
        title: 'Agente indisponível',
        description: 'Usando impressão pelo navegador como fallback.',
        variant: 'destructive',
      });
      return false;
    }
  }, [settings, toast]);

  return {
    settings,
    isLoading,
    isSaving,
    isOffline,
    save,
    testAgent,
    printViaAgent,
  };
}
