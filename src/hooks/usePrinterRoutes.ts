import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PrinterRoute {
  id: string;
  tenant_id: string;
  label: string;
  printer_name: string | null;
  route_type: string;
  paper_width: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_ROUTES: Omit<PrinterRoute, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>[] = [
  { label: 'Caixa', printer_name: null, route_type: 'caixa', paper_width: '80', display_order: 0 },
  { label: 'Cozinha', printer_name: null, route_type: 'cozinha', paper_width: '80', display_order: 1 },
  { label: 'Bar', printer_name: null, route_type: 'bar', paper_width: '80', display_order: 2 },
];

export function usePrinterRoutes() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [routes, setRoutes] = useState<PrinterRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load routes, seed defaults if empty
  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        const { data, error } = await supabase
          .from('printer_routes')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('display_order');

        if (error) throw error;

        if (!data || data.length === 0) {
          // Seed default routes
          const toInsert = DEFAULT_ROUTES.map((r, i) => ({
            ...r,
            tenant_id: tenantId!,
            display_order: i,
          }));

          const { data: seeded, error: seedError } = await supabase
            .from('printer_routes')
            .insert(toInsert)
            .select();

          if (seedError) throw seedError;
          setRoutes((seeded as PrinterRoute[]) || []);
        } else {
          setRoutes(data as PrinterRoute[]);
        }
      } catch (err) {
        console.error('Failed to load printer routes:', err);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [tenantId]);

  const addRoute = useCallback(async (label: string) => {
    if (!tenantId) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('printer_routes')
        .insert({
          tenant_id: tenantId,
          label,
          route_type: label.toLowerCase().replace(/\s+/g, '_'),
          display_order: routes.length,
        })
        .select()
        .single();

      if (error) throw error;
      setRoutes(prev => [...prev, data as PrinterRoute]);
      toast({ title: `Rota "${label}" adicionada` });
    } catch (err) {
      console.error('Failed to add route:', err);
      toast({ title: 'Erro ao adicionar rota', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [tenantId, routes.length, toast]);

  const updateRoute = useCallback(async (id: string, updates: Partial<Pick<PrinterRoute, 'label' | 'printer_name' | 'paper_width'>>) => {
    if (!tenantId) return;
    try {
      const { error } = await supabase
        .from('printer_routes')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (err) {
      console.error('Failed to update route:', err);
      toast({ title: 'Erro ao atualizar rota', variant: 'destructive' });
    }
  }, [tenantId, toast]);

  const removeRoute = useCallback(async (id: string) => {
    if (!tenantId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('printer_routes')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setRoutes(prev => prev.filter(r => r.id !== id));
      toast({ title: 'Rota removida' });
    } catch (err) {
      console.error('Failed to remove route:', err);
      toast({ title: 'Erro ao remover rota', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [tenantId, toast]);

  return { routes, isLoading, isSaving, addRoute, updateRoute, removeRoute };
}
