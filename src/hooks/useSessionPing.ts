import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PING_INTERVAL_MS = 60_000; // 60 segundos

/**
 * Dispara um ping de sessão imediatamente e a cada 60s enquanto autenticado.
 * Atualiza last_seen_at na tabela user_roles via RPC track_session_ping().
 * Super admins têm seus queries invalidados após cada ping.
 */
export function useSessionPing() {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const lastPingRef = useRef<number>(0);

  const doPing = async () => {
    const now = Date.now();
    // Throttle: no mínimo 30s entre pings manuais
    if (now - lastPingRef.current < 30_000) return;
    lastPingRef.current = now;

    try {
      await supabase.rpc('track_session_ping' as any);
    } catch {
      // silencioso — não vazar erros de telemetria para o usuário
    }
  };

  useEffect(() => {
    if (!user) return;

    // Ping imediato ao montar
    doPing();

    // Ping periódico a cada 60s
    const interval = setInterval(doPing, PING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Ping extra em mudança de rota (via popstate / hashchange)
  useEffect(() => {
    if (!user) return;
    const handler = () => doPing();
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [user?.id]);
}
