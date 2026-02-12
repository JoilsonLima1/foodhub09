import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PrinterRoute {
  id: string;
  tenant_id: string;
  label: string;
  printer_name: string | null;
  printers: string[];
  route_type: string;
  route_key: string;
  is_base: boolean;
  paper_width: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Base sectors that always exist and cannot be removed */
export const BASE_SECTORS = [
  { label: 'PDV (Caixa)', route_key: 'caixa', route_type: 'caixa', display_order: 0 },
  { label: 'Cozinha', route_key: 'cozinha', route_type: 'cozinha', display_order: 1 },
  { label: 'Bar', route_key: 'bar', route_type: 'bar', display_order: 2 },
] as const;

/**
 * Resolves which printers should receive a print job for a given route_key.
 * Returns an array of printer names (empty = use OS default).
 */
export function resolveRouteKey(routes: PrinterRoute[], routeKey: string): string[] {
  const route = routes.find(r => r.route_key === routeKey);
  if (!route) return [];
  return route.printers.length > 0 ? route.printers : [];
}

export function usePrinterRoutes() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [routes, setRoutes] = useState<PrinterRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load routes, seed base sectors if missing
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

        let existing = (data || []) as PrinterRoute[];

        // Ensure all base sectors exist
        const missingBase = BASE_SECTORS.filter(
          base => !existing.some(r => r.route_key === base.route_key)
        );

        if (missingBase.length > 0) {
          const toInsert = missingBase.map(base => ({
            tenant_id: tenantId!,
            label: base.label,
            route_type: base.route_type,
            route_key: base.route_key,
            is_base: true,
            paper_width: '80',
            printers: [] as string[],
            display_order: base.display_order,
          }));

          const { data: seeded, error: seedError } = await supabase
            .from('printer_routes')
            .insert(toInsert)
            .select();

          if (seedError) throw seedError;
          existing = [...existing, ...((seeded as PrinterRoute[]) || [])];
        }

        // Ensure is_base flag is correct on existing rows (migration fix)
        const baseKeys: string[] = BASE_SECTORS.map(b => b.route_key);
        for (const route of existing) {
          if (baseKeys.includes(route.route_key) && !route.is_base) {
            await supabase
              .from('printer_routes')
              .update({ is_base: true })
              .eq('id', route.id);
            route.is_base = true;
          }
        }

        // Sort by display_order
        existing.sort((a, b) => a.display_order - b.display_order);
        setRoutes(existing);
      } catch (err) {
        console.error('Failed to load printer routes:', err);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [tenantId]);

  /** Add a custom (non-base) sector */
  const addRoute = useCallback(async (label: string) => {
    if (!tenantId) return;
    const routeKey = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Check for duplicate route_key
    if (routes.some(r => r.route_key === routeKey)) {
      toast({ title: `Setor "${label}" já existe`, variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('printer_routes')
        .insert({
          tenant_id: tenantId,
          label,
          route_type: routeKey,
          route_key: routeKey,
          is_base: false,
          printers: [],
          display_order: routes.length,
        })
        .select()
        .single();

      if (error) throw error;
      setRoutes(prev => [...prev, data as PrinterRoute]);
      toast({ title: `Setor "${label}" adicionado` });
    } catch (err) {
      console.error('Failed to add route:', err);
      toast({ title: 'Erro ao adicionar setor', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [tenantId, routes, toast]);

  /** Update route label or paper_width (not printers — use addPrinter/removePrinter) */
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
      toast({ title: 'Erro ao atualizar setor', variant: 'destructive' });
    }
  }, [tenantId, toast]);

  /** Add a printer to a sector */
  const addPrinterToRoute = useCallback(async (routeId: string, printerName: string) => {
    if (!tenantId) return;
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    if (route.printers.includes(printerName)) {
      toast({ title: 'Impressora já vinculada a este setor', variant: 'destructive' });
      return;
    }

    const newPrinters = [...route.printers, printerName];
    try {
      const { error } = await supabase
        .from('printer_routes')
        .update({ printers: newPrinters, printer_name: newPrinters[0] || null })
        .eq('id', routeId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setRoutes(prev => prev.map(r =>
        r.id === routeId ? { ...r, printers: newPrinters, printer_name: newPrinters[0] || null } : r
      ));
      toast({ title: `Impressora adicionada ao setor` });
    } catch (err) {
      console.error('Failed to add printer to route:', err);
      toast({ title: 'Erro ao vincular impressora', variant: 'destructive' });
    }
  }, [tenantId, routes, toast]);

  /** Remove a printer from a sector */
  const removePrinterFromRoute = useCallback(async (routeId: string, printerName: string) => {
    if (!tenantId) return;
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    const newPrinters = route.printers.filter(p => p !== printerName);
    try {
      const { error } = await supabase
        .from('printer_routes')
        .update({ printers: newPrinters, printer_name: newPrinters[0] || null })
        .eq('id', routeId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setRoutes(prev => prev.map(r =>
        r.id === routeId ? { ...r, printers: newPrinters, printer_name: newPrinters[0] || null } : r
      ));
    } catch (err) {
      console.error('Failed to remove printer from route:', err);
      toast({ title: 'Erro ao remover impressora', variant: 'destructive' });
    }
  }, [tenantId, routes, toast]);

  /** Remove a custom sector (base sectors cannot be removed) */
  const removeRoute = useCallback(async (id: string) => {
    if (!tenantId) return;
    const route = routes.find(r => r.id === id);
    if (route?.is_base) {
      toast({ title: 'Setores base não podem ser removidos', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('printer_routes')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setRoutes(prev => prev.filter(r => r.id !== id));
      toast({ title: 'Setor removido' });
    } catch (err) {
      console.error('Failed to remove route:', err);
      toast({ title: 'Erro ao remover setor', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [tenantId, routes, toast]);

  return {
    routes,
    isLoading,
    isSaving,
    addRoute,
    updateRoute,
    removeRoute,
    addPrinterToRoute,
    removePrinterFromRoute,
    resolveRouteKey: (key: string) => resolveRouteKey(routes, key),
  };
}
