import { supabase } from '@/integrations/supabase/client';
import type { OrderStatus } from '@/types/database';

// Customer-friendly notification messages
const STATUS_NOTIFICATIONS: Record<OrderStatus, { title: string; body: string }> = {
  pending_payment: {
    title: '💳 Aguardando Pagamento',
    body: 'Seu pedido está aguardando confirmação do pagamento.',
  },
  paid: {
    title: '✅ Pedido Registrado!',
    body: 'Seu pedido foi recebido e está sendo processado.',
  },
  confirmed: {
    title: '👍 Pedido Confirmado!',
    body: 'Seu pedido foi confirmado e logo entrará em preparo.',
  },
  preparing: {
    title: '👨‍🍳 Em Preparação!',
    body: 'Sua comida está sendo preparada com carinho.',
  },
  ready: {
    title: '🎉 Pedido Pronto!',
    body: 'Seu pedido está pronto para retirada!',
  },
  out_for_delivery: {
    title: '🚚 Saiu para Entrega!',
    body: 'Seu pedido está a caminho. Fique atento!',
  },
  delivered: {
    title: '📦 Pedido Entregue!',
    body: 'Seu pedido foi entregue. Bom apetite!',
  },
  cancelled: {
    title: '❌ Pedido Cancelado',
    body: 'Infelizmente seu pedido foi cancelado.',
  },
};

export async function notifyOrderStatusChange(
  orderId: string,
  newStatus: OrderStatus,
  orderNumber: number
) {
  try {
    // Get push subscriptions for this order
    const { data: subscriptions, error } = await supabase
      .from('customer_push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('order_id', orderId);

    if (error || !subscriptions || subscriptions.length === 0) {
      return { sent: 0 };
    }

    const notification = STATUS_NOTIFICATIONS[newStatus];
    if (!notification) return { sent: 0 };

    // In a real implementation, this would call an edge function
    // that uses web-push to send notifications to each subscription.
    // For now, we'll use the Service Worker directly if available.
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'BROADCAST_ORDER_UPDATE',
        orderId,
        orderNumber,
        status: newStatus,
        notification: {
          title: `${notification.title} - Pedido #${orderNumber}`,
          body: notification.body,
          tag: `order-${orderNumber}-${newStatus}`,
          data: {
            url: `/rastrear?pedido=${orderNumber}`,
            orderId,
            status: newStatus,
          },
        },
      });
    }

    return { sent: subscriptions.length };
  } catch (error) {
    console.error('Error sending order notification:', error);
    return { sent: 0, error };
  }
}

// Helper to add status history entry with notification
export async function updateOrderStatusWithNotification(
  orderId: string,
  newStatus: OrderStatus,
  orderNumber: number,
  userId?: string,
  notes?: string
) {
  // Update order status
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (updateError) throw updateError;

  // Add to status history
  const { error: historyError } = await supabase.from('order_status_history').insert({
    order_id: orderId,
    status: newStatus,
    changed_by: userId || null,
    notes: notes || null,
  });

  if (historyError) {
    console.error('Error creating status history:', historyError);
  }

  // Send push notification to customer
  await notifyOrderStatusChange(orderId, newStatus, orderNumber);

  return { success: true };
}
