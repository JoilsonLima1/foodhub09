import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CartItem, PaymentMethod, OrderOrigin, OrderStatus, PaymentStatus } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { reduceStockForOrder } from './useStockReduction';

interface CreateOrderInput {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  isDelivery?: boolean;
  deliveryAddress?: string;
  deliveryFee?: number;
  notes?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

interface CreateOrderResult {
  orderId: string;
  orderNumber: number;
  items: CartItem[];
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
}

export function useCreateOrder() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrderInput): Promise<CreateOrderResult> => {
      if (!tenantId) throw new Error('Tenant não configurado');
      if (!user) throw new Error('Usuário não autenticado');

      const subtotal = input.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const deliveryFee = input.deliveryFee || 0;
      const total = subtotal + deliveryFee;

      // Create order
      const orderStatus = (input.orderStatus || 'paid') as OrderStatus;
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenantId,
          origin: 'pos' as OrderOrigin,
          status: orderStatus,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          is_delivery: input.isDelivery || false,
          delivery_address: input.deliveryAddress,
          customer_name: input.customerName,
          customer_phone: input.customerPhone,
          notes: input.notes,
          created_by: user.id,
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = input.items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        variation_id: item.variationId || null,
        variation_name: item.variationName || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create payment record
      const paymentStatus = (input.paymentStatus || 'approved') as PaymentStatus;
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          tenant_id: tenantId,
          amount: total,
          payment_method: input.paymentMethod,
          status: paymentStatus,
          paid_at: paymentStatus === 'approved' ? new Date().toISOString() : null,
        });

      if (paymentError) throw paymentError;

      // Create order status history
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: order.id,
          status: 'paid',
          changed_by: user.id,
          notes: `Pedido criado via PDV - ${input.paymentMethod}`,
        });

      if (historyError) {
        console.error('Error creating status history:', historyError);
        // Non-critical error, don't throw
      }

      // Reduce stock based on recipes (ficha técnica)
      const stockResult = await reduceStockForOrder(
        input.items,
        order.id,
        tenantId,
        user.id
      );

      if (stockResult.reducedItems > 0) {
        console.log(`Stock reduced for ${stockResult.reducedItems} ingredients`);
      }

      if (stockResult.errors.length > 0) {
        console.warn('Stock reduction errors:', stockResult.errors);
      }

      return {
        orderId: order.id,
        orderNumber: order.order_number,
        items: input.items,
        subtotal,
        total,
        paymentMethod: input.paymentMethod,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast({
        title: 'Pedido criado!',
        description: `Pedido #${result.orderNumber} registrado com sucesso.`,
      });
    },
    onError: (error) => {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}
