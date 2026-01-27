import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Table {
  id: string;
  number: number;
  name: string | null;
  qr_code: string | null;
  is_active: boolean;
  activeSession?: TableSession | null;
}

export interface TableSession {
  id: string;
  table_id: string;
  status: 'open' | 'closed' | 'cancelled';
  customer_name: string | null;
  customer_phone: string | null;
  opened_at: string;
  closed_at: string | null;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  items?: TableSessionItem[];
}

export interface TableSessionItem {
  id: string;
  session_id: string;
  product_id: string | null;
  product_name: string;
  variation_id: string | null;
  variation_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  added_at: string;
}

export function useTables() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const tablesQuery = useQuery({
    queryKey: ['tables', tenantId],
    queryFn: async (): Promise<Table[]> => {
      if (!tenantId) return [];

      // Fetch tables
      const { data: tables, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('number');

      if (tablesError) throw tablesError;

      // Fetch active sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('table_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'open');

      if (sessionsError) throw sessionsError;

      const sessionsMap = new Map(sessions?.map(s => [s.table_id, s]) || []);

      return (tables || []).map(t => ({
        id: t.id,
        number: t.number,
        name: t.name,
        qr_code: t.qr_code,
        is_active: t.is_active ?? true,
        activeSession: sessionsMap.get(t.id) as TableSession | undefined || null,
      }));
    },
    enabled: !!tenantId,
  });

  const createTable = useMutation({
    mutationFn: async (data: { number: number; name?: string }) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      const { data: table, error } = await supabase
        .from('tables')
        .insert({
          tenant_id: tenantId,
          number: data.number,
          name: data.name || null,
        })
        .select()
        .single();

      if (error) throw error;
      return table;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast({ title: 'Mesa criada com sucesso!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar mesa',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const updateTable = useMutation({
    mutationFn: async (data: { id: string; number?: number; name?: string; is_active?: boolean }) => {
      const { data: table, error } = await supabase
        .from('tables')
        .update({
          number: data.number,
          name: data.name,
          is_active: data.is_active,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return table;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast({ title: 'Mesa atualizada!' });
    },
  });

  const deleteTable = useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase
        .from('tables')
        .update({ is_active: false })
        .eq('id', tableId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast({ title: 'Mesa removida!' });
    },
  });

  return {
    tables: tablesQuery.data || [],
    isLoading: tablesQuery.isLoading,
    createTable,
    updateTable,
    deleteTable,
    refetch: tablesQuery.refetch,
  };
}

export function useTableSession(sessionId: string | null) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['table-session', sessionId],
    queryFn: async (): Promise<TableSession | null> => {
      if (!sessionId) return null;

      const { data: session, error: sessionError } = await supabase
        .from('table_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      const { data: items, error: itemsError } = await supabase
        .from('table_session_items')
        .select('*')
        .eq('session_id', sessionId)
        .order('added_at');

      if (itemsError) throw itemsError;

      return {
        ...session,
        status: session.status as 'open' | 'closed' | 'cancelled',
        items: (items || []).map(i => ({
          ...i,
          status: i.status as 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled',
        })),
      };
    },
    enabled: !!sessionId,
  });

  return {
    session: sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    refetch: sessionQuery.refetch,
  };
}

export function useTableSessionMutations() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  const openSession = useMutation({
    mutationFn: async (data: { tableId: string; customerName?: string; customerPhone?: string }) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      const { data: session, error } = await supabase
        .from('table_sessions')
        .insert({
          tenant_id: tenantId,
          table_id: data.tableId,
          customer_name: data.customerName || null,
          customer_phone: data.customerPhone || null,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table-session'] });
      toast({ title: 'Comanda aberta!' });
    },
  });

  const addItem = useMutation({
    mutationFn: async (data: {
      sessionId: string;
      productId: string;
      productName: string;
      variationId?: string;
      variationName?: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }) => {
      const { data: item, error } = await supabase
        .from('table_session_items')
        .insert({
          session_id: data.sessionId,
          product_id: data.productId,
          product_name: data.productName,
          variation_id: data.variationId || null,
          variation_name: data.variationName || null,
          quantity: data.quantity,
          unit_price: data.unitPrice,
          total_price: data.quantity * data.unitPrice,
          notes: data.notes || null,
          added_by: user?.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Update session total
      await updateSessionTotals(data.sessionId);

      return item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['table-session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const updateItemStatus = useMutation({
    mutationFn: async (data: { itemId: string; sessionId: string; status: string }) => {
      const { error } = await supabase
        .from('table_session_items')
        .update({ status: data.status })
        .eq('id', data.itemId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['table-session', variables.sessionId] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (data: { itemId: string; sessionId: string }) => {
      const { error } = await supabase
        .from('table_session_items')
        .delete()
        .eq('id', data.itemId);

      if (error) throw error;

      await updateSessionTotals(data.sessionId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['table-session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const closeSession = useMutation({
    mutationFn: async (data: { sessionId: string; discount?: number; paymentMethod?: string }) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      // First, get the current session with its items
      const { data: session, error: fetchError } = await supabase
        .from('table_sessions')
        .select('*, table_id')
        .eq('id', data.sessionId)
        .single();

      if (fetchError) throw fetchError;

      // Get session items
      const { data: items, error: itemsError } = await supabase
        .from('table_session_items')
        .select('*')
        .eq('session_id', data.sessionId)
        .neq('status', 'cancelled');

      if (itemsError) throw itemsError;

      const discount = data.discount || 0;
      const subtotal = session.subtotal || 0;
      const total = Math.max(0, subtotal - discount);

      // Create order record for reports
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenantId,
          origin: 'pos' as const,
          status: 'delivered' as const,
          is_delivery: false,
          customer_name: session.customer_name,
          customer_phone: session.customer_phone,
          subtotal,
          discount,
          total,
          notes: session.notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items from session items
      if (items && items.length > 0) {
        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          variation_id: item.variation_id,
          variation_name: item.variation_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes,
        }));

        const { error: orderItemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (orderItemsError) throw orderItemsError;
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          tenant_id: tenantId,
          order_id: order.id,
          amount: total,
          payment_method: (data.paymentMethod || 'cash') as 'cash' | 'pix' | 'credit_card' | 'debit_card' | 'voucher' | 'mixed',
          status: 'approved' as const,
          paid_at: new Date().toISOString(),
        }]);

      if (paymentError) throw paymentError;

      // Update session as closed
      const { error: updateError } = await supabase
        .from('table_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
          discount,
          total,
        })
        .eq('id', data.sessionId);

      if (updateError) throw updateError;

      return { session, order };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table-session'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Comanda fechada com sucesso!' });
    },
  });

  return {
    openSession,
    addItem,
    updateItemStatus,
    removeItem,
    closeSession,
  };
}

async function updateSessionTotals(sessionId: string) {
  // Calculate new subtotal from items
  const { data: items, error: itemsError } = await supabase
    .from('table_session_items')
    .select('total_price')
    .eq('session_id', sessionId)
    .neq('status', 'cancelled');

  if (itemsError) throw itemsError;

  const subtotal = items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;

  const { error: updateError } = await supabase
    .from('table_sessions')
    .update({ subtotal, total: subtotal })
    .eq('id', sessionId);

  if (updateError) throw updateError;
}
