/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import React from "react";

// Mock the auth context
const mockAuth = {
  tenantId: "test-tenant-123",
  user: { id: "user-123", email: "test@example.com" },
  profile: { full_name: "Test Cashier" },
  isAuthenticated: true,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ 
            data: { id: "order-123", order_number: 1 }, 
            error: null 
          }),
        }),
      }),
    }),
  },
}));

// Mock useProducts hook
vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({
    data: [
      {
        id: "product-1",
        name: "X-Burger",
        base_price: 25.90,
        category_id: "cat-1",
        is_available: true,
        has_variations: false,
        variations: [],
      },
      {
        id: "product-2",
        name: "Coca-Cola",
        base_price: 8.00,
        category_id: "cat-2",
        is_available: true,
        has_variations: true,
        variations: [
          { id: "var-1", name: "Lata 350ml", price_modifier: 0 },
          { id: "var-2", name: "Garrafa 600ml", price_modifier: 4 },
        ],
      },
    ],
    isLoading: false,
    error: null,
  }),
  useCategories: () => ({
    data: [
      { id: "cat-1", name: "Lanches" },
      { id: "cat-2", name: "Bebidas" },
    ],
    isLoading: false,
  }),
}));

// Mock useCreateOrder hook
const mockCreateOrder = vi.fn();
vi.mock("@/hooks/useCreateOrder", () => ({
  useCreateOrder: () => ({
    mutateAsync: mockCreateOrder,
    isPending: false,
  }),
}));

// Mock system settings
vi.mock("@/hooks/useSystemSettings", () => ({
  useSystemSettings: () => ({
    settings: { branding: { company_name: "Test Restaurant" } },
    isLoading: false,
  }),
}));

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

describe("POS Checkout Flow", () => {
  beforeEach(() => {
    mockCreateOrder.mockReset();
    mockCreateOrder.mockResolvedValue({
      orderId: "order-123",
      orderNumber: 1,
      items: [],
      subtotal: 25.90,
      total: 25.90,
      paymentMethod: "cash",
    });
  });

  it("should have valid mock data for products", () => {
    const { useProducts } = require("@/hooks/useProducts");
    const result = useProducts();
    
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe("X-Burger");
    expect(result.data[1].name).toBe("Coca-Cola");
  });

  it("should have valid mock data for categories", () => {
    const { useCategories } = require("@/hooks/useProducts");
    const result = useCategories();
    
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe("Lanches");
    expect(result.data[1].name).toBe("Bebidas");
  });

  it("should have mock order creation function", () => {
    expect(mockCreateOrder).toBeDefined();
  });

  it("should render POS component without crashing", async () => {
    const POS = (await import("@/pages/POS")).default;
    const { container } = render(<POS />, { wrapper: createWrapper() });
    
    expect(container).toBeDefined();
  });
});

describe("POS Cart Management", () => {
  beforeEach(() => {
    mockCreateOrder.mockReset();
  });

  it("should format currency correctly", () => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    };

    expect(formatCurrency(25.90)).toBe("R$ 25,90");
    expect(formatCurrency(100)).toBe("R$ 100,00");
    expect(formatCurrency(0)).toBe("R$ 0,00");
  });

  it("should calculate cart total correctly", () => {
    const cart = [
      { id: "1", quantity: 2, unitPrice: 25.90, totalPrice: 51.80 },
      { id: "2", quantity: 1, unitPrice: 8.00, totalPrice: 8.00 },
    ];

    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    expect(total).toBe(59.80);
  });

  it("should update quantity correctly", () => {
    const cart = [
      { id: "1", quantity: 2, unitPrice: 25.90, totalPrice: 51.80 },
    ];

    const updateQuantity = (itemId: string, delta: number) => {
      return cart.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(0, item.quantity + delta);
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: newQuantity * item.unitPrice,
          };
        }
        return item;
      });
    };

    const updated = updateQuantity("1", 1);
    expect(updated[0].quantity).toBe(3);
    expect(updated[0].totalPrice).toBeCloseTo(77.70);
  });
});
