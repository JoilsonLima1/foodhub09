import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CartItem } from '@/types/database';

interface StockReductionResult {
  success: boolean;
  reducedItems: number;
  errors: string[];
}

export async function reduceStockForOrder(
  orderItems: CartItem[],
  orderId: string,
  tenantId: string,
  userId: string
): Promise<StockReductionResult> {
  const errors: string[] = [];
  let reducedItems = 0;

  for (const item of orderItems) {
    try {
      // Find recipe for this product/variation
      const recipeQuery = supabase
        .from('recipes')
        .select('id')
        .eq('product_id', item.productId);

      if (item.variationId) {
        recipeQuery.eq('variation_id', item.variationId);
      } else {
        recipeQuery.is('variation_id', null);
      }

      const { data: recipe, error: recipeError } = await recipeQuery.maybeSingle();

      if (recipeError) {
        console.error('Error fetching recipe:', recipeError);
        continue;
      }

      if (!recipe) {
        // No recipe for this product, skip stock reduction
        console.log(`No recipe found for product ${item.productId}`);
        continue;
      }

      // Get recipe items (ingredients)
      const { data: recipeItems, error: itemsError } = await supabase
        .from('recipe_items')
        .select('ingredient_id, quantity')
        .eq('recipe_id', recipe.id);

      if (itemsError) {
        console.error('Error fetching recipe items:', itemsError);
        errors.push(`Erro ao buscar ingredientes para ${item.productName}`);
        continue;
      }

      if (!recipeItems || recipeItems.length === 0) {
        continue;
      }

      // Reduce stock for each ingredient
      for (const recipeItem of recipeItems) {
        const quantityToReduce = recipeItem.quantity * item.quantity;

        // Create stock movement record
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            tenant_id: tenantId,
            ingredient_id: recipeItem.ingredient_id,
            movement_type: 'exit',
            quantity: quantityToReduce,
            reference_type: 'order',
            reference_id: orderId,
            created_by: userId,
            notes: `Baixa automática - Pedido ${orderId.slice(0, 8)}`,
          });

        if (movementError) {
          console.error('Error creating stock movement:', movementError);
          errors.push(`Erro ao registrar movimento de estoque`);
          continue;
        }

        // Update ingredient current_stock
        const { data: ingredient, error: fetchError } = await supabase
          .from('ingredients')
          .select('current_stock')
          .eq('id', recipeItem.ingredient_id)
          .single();

        if (fetchError) {
          console.error('Error fetching ingredient:', fetchError);
          continue;
        }

        const newStock = (ingredient.current_stock || 0) - quantityToReduce;

        const { error: updateError } = await supabase
          .from('ingredients')
          .update({ current_stock: newStock })
          .eq('id', recipeItem.ingredient_id);

        if (updateError) {
          console.error('Error updating ingredient stock:', updateError);
          errors.push(`Erro ao atualizar estoque de ingrediente`);
        } else {
          reducedItems++;
        }
      }
    } catch (error) {
      console.error('Error in stock reduction:', error);
      errors.push(`Erro ao processar ${item.productName}`);
    }
  }

  return {
    success: errors.length === 0,
    reducedItems,
    errors,
  };
}
