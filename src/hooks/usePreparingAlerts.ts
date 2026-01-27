import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ALERT_THRESHOLD_MINUTES = 15;

export function usePreparingAlerts() {
  const { tenantId } = useAuth();
  const alertedOrdersRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const playAlertSound = useCallback(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Urgent warning sound - two tones
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.15);
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialDecayToValueAtTime?.(0.01, audioContext.currentTime + 0.5) ||
      gainNode.gain.setValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }, []);

  const checkPreparingOrders = useCallback(async () => {
    if (!tenantId) return;

    try {
      const thresholdTime = new Date(Date.now() - ALERT_THRESHOLD_MINUTES * 60 * 1000).toISOString();

      // Use orders_safe view for PII masking based on user roles
      const { data: stuckOrders } = await supabase
        .from('orders_safe')
        .select('id, order_number, customer_name, updated_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'preparing')
        .lt('updated_at', thresholdTime);

      if (stuckOrders && stuckOrders.length > 0) {
        stuckOrders.forEach((order) => {
          if (!alertedOrdersRef.current.has(order.id)) {
            alertedOrdersRef.current.add(order.id);
            
            const minutesInPrep = Math.floor(
              (Date.now() - new Date(order.updated_at).getTime()) / 60000
            );

            playAlertSound();
            
            toast.warning(`Pedido #${order.order_number} em preparo há ${minutesInPrep} minutos!`, {
              description: order.customer_name || 'Cliente anônimo',
              duration: 10000,
              action: {
                label: 'Ver Pedidos',
                onClick: () => window.location.href = '/orders',
              },
            });
          }
        });
      }

      // Clean up resolved orders from alert set
      const currentOrderIds = new Set(stuckOrders?.map(o => o.id) || []);
      alertedOrdersRef.current.forEach((id) => {
        if (!currentOrderIds.has(id)) {
          alertedOrdersRef.current.delete(id);
        }
      });
    } catch (error) {
      console.error('Error checking preparing orders:', error);
    }
  }, [tenantId, playAlertSound]);

  useEffect(() => {
    if (!tenantId) return;

    // Check immediately
    checkPreparingOrders();

    // Check every 2 minutes
    intervalRef.current = setInterval(checkPreparingOrders, 2 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tenantId, checkPreparingOrders]);

  return { checkPreparingOrders };
}
