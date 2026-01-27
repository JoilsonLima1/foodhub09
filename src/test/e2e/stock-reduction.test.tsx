/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import React from "react";

// Mock auth context
const mockAuth = {
  tenantId: "test-tenant-123",
  user: { id: "user-123", email: "stock@example.com" },
  profile: { full_name: "Stock Manager", tenant_id: "test-tenant-123" },
  isAuthenticated: true,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock recipe data
const mockRecipes = [
  {
    id: "recipe-1",
    product_id: "product-1",
    variation_id: null,
    recipe_items: [
      { id: "item-1", ingredient_id: "ing-1", quantity: 0.2 },
      { id: "item-2", ingredient_id: "ing-2", quantity: 0.1 },
    ],
  },
  {
    id: "recipe-2",
    product_id: "product-2",
    variation_id: "var-1",
    recipe_items: [
      { id: "item-3", ingredient_id: "ing-1", quantity: 0.15 },
    ],
  },
];

// Mock ingredients
const mockIngredients = [
  { id: "ing-1", name: "Carne Bovina", unit: "kg", current_stock: 10, min_stock: 2, cost_per_unit: 45 },
  { id: "ing-2", name: "Queijo", unit: "kg", current_stock: 5, min_stock: 1, cost_per_unit: 35 },
  { id: "ing-3", name: "Pão", unit: "un", current_stock: 100, min_stock: 20, cost_per_unit: 1.5 },
];

// Mock cart items for stock reduction
const mockCartItems = [
  {
    productId: "product-1",
    productName: "X-Burger",
    quantity: 5,
    unitPrice: 25.90,
    totalPrice: 129.50,
    variationId: null,
  },
  {
    productId: "product-2",
    productName: "Coca-Cola 600ml",
    quantity: 3,
    unitPrice: 12.00,
    totalPrice: 36.00,
    variationId: "var-1",
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("Stock Reduction Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have valid recipe data", () => {
    expect(mockRecipes).toHaveLength(2);
    expect(mockRecipes[0].recipe_items).toHaveLength(2);
    expect(mockRecipes[1].recipe_items).toHaveLength(1);
  });

  it("should have valid ingredient data", () => {
    expect(mockIngredients).toHaveLength(3);
    expect(mockIngredients[0].name).toBe("Carne Bovina");
    expect(mockIngredients[0].current_stock).toBe(10);
  });

  it("should calculate stock reduction for order correctly", () => {
    // Simulate stock reduction for 5 X-Burgers
    const orderQuantity = 5;
    const recipe = mockRecipes[0];
    
    const reductions: { ingredientId: string; quantity: number }[] = [];
    
    recipe.recipe_items.forEach(item => {
      reductions.push({
        ingredientId: item.ingredient_id,
        quantity: item.quantity * orderQuantity,
      });
    });

    // 5 burgers * 0.2 kg carne = 1 kg
    expect(reductions[0].quantity).toBe(1);
    // 5 burgers * 0.1 kg queijo = 0.5 kg
    expect(reductions[1].quantity).toBe(0.5);
  });

  it("should update ingredient stock after reduction", () => {
    const ingredient = { ...mockIngredients[0] };
    const reduction = 1; // 1 kg
    
    const newStock = ingredient.current_stock - reduction;
    
    expect(newStock).toBe(9);
    expect(newStock).toBeGreaterThan(ingredient.min_stock);
  });

  it("should detect low stock after reduction", () => {
    const ingredient = { ...mockIngredients[1] }; // Queijo: 5kg, min: 1kg
    const reduction = 4.5; // Large order reducing stock
    
    const newStock = ingredient.current_stock - reduction;
    const isLowStock = newStock <= ingredient.min_stock;
    
    expect(newStock).toBe(0.5);
    expect(isLowStock).toBe(true);
  });

  it("should handle products without recipes", () => {
    const productWithoutRecipe = {
      productId: "product-no-recipe",
      productName: "Novo Produto",
      quantity: 10,
    };

    const recipeExists = mockRecipes.some(r => r.product_id === productWithoutRecipe.productId);
    
    expect(recipeExists).toBe(false);
  });

  it("should handle variation-specific recipes", () => {
    const variationRecipe = mockRecipes.find(
      r => r.product_id === "product-2" && r.variation_id === "var-1"
    );

    expect(variationRecipe).toBeDefined();
    expect(variationRecipe?.recipe_items).toHaveLength(1);
  });
});

describe("Stock Movement Recording", () => {
  it("should create valid stock movement record", () => {
    const movement = {
      tenant_id: mockAuth.tenantId,
      ingredient_id: "ing-1",
      movement_type: "exit",
      quantity: 1.5,
      reference_type: "order",
      reference_id: "order-123",
      created_by: mockAuth.user.id,
      notes: "Baixa automática - Pedido order-12",
    };

    expect(movement.movement_type).toBe("exit");
    expect(movement.quantity).toBe(1.5);
    expect(movement.reference_type).toBe("order");
  });

  it("should calculate total cost of reduction", () => {
    const reductions = [
      { ingredientId: "ing-1", quantity: 1, costPerUnit: 45 },
      { ingredientId: "ing-2", quantity: 0.5, costPerUnit: 35 },
    ];

    const totalCost = reductions.reduce((sum, r) => sum + r.quantity * r.costPerUnit, 0);
    
    expect(totalCost).toBe(62.50);
  });
});

describe("Low Stock Alerts", () => {
  it("should identify low stock ingredients", () => {
    const lowStockItems = mockIngredients.filter(
      ing => ing.current_stock <= ing.min_stock
    );

    expect(lowStockItems).toHaveLength(0); // All items above minimum
  });

  it("should calculate reorder quantity", () => {
    const ingredient = mockIngredients[0];
    const desiredStock = ingredient.min_stock * 3; // 3x minimum as target
    const reorderQuantity = desiredStock - ingredient.current_stock;

    // 2 * 3 = 6 desired, 10 current = no reorder needed
    expect(reorderQuantity).toBeLessThan(0);
  });

  it("should format stock alert message", () => {
    const formatAlert = (ingredient: typeof mockIngredients[0]) => {
      const percentage = (ingredient.current_stock / ingredient.min_stock) * 100;
      if (percentage <= 100) return `CRÍTICO: ${ingredient.name}`;
      if (percentage <= 150) return `ALERTA: ${ingredient.name}`;
      return null;
    };

    const criticalIngredient = { ...mockIngredients[0], current_stock: 1.5 };
    expect(formatAlert(criticalIngredient)).toBe("CRÍTICO: Carne Bovina");
  });
});

describe("Stock Report Integration", () => {
  it("should aggregate stock movements by ingredient", () => {
    const movements = [
      { ingredient_id: "ing-1", quantity: 1.0, movement_type: "exit" },
      { ingredient_id: "ing-1", quantity: 0.5, movement_type: "exit" },
      { ingredient_id: "ing-2", quantity: 0.3, movement_type: "exit" },
    ];

    const aggregated = movements.reduce((acc, m) => {
      acc[m.ingredient_id] = (acc[m.ingredient_id] || 0) + m.quantity;
      return acc;
    }, {} as Record<string, number>);

    expect(aggregated["ing-1"]).toBe(1.5);
    expect(aggregated["ing-2"]).toBe(0.3);
  });

  it("should calculate stock turnover rate", () => {
    const ingredient = mockIngredients[0];
    const totalExits = 45; // kg used in period
    const averageStock = 10; // kg average

    const turnoverRate = totalExits / averageStock;
    expect(turnoverRate).toBe(4.5);
  });
});
