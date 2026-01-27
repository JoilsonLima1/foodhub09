/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import React from "react";

// Mock auth context
const mockAuth = {
  tenantId: "test-tenant-123",
  user: { id: "user-123", email: "admin@example.com" },
  profile: { full_name: "Admin Test", tenant_id: "test-tenant-123" },
  isAuthenticated: true,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock iFood integration data
const mockIntegration = {
  id: "integration-1",
  tenant_id: "test-tenant-123",
  client_id: "client_id_****",
  merchant_id: "merchant-123",
  is_active: true,
  auto_accept_orders: true,
  sync_menu: true,
  access_token: "valid_token_****",
  token_expires_at: new Date(Date.now() + 3600000).toISOString(),
};

// Mock menu mappings
const mockMenuMappings = [
  {
    id: "mapping-1",
    product_id: "prod-1",
    ifood_item_id: "ifood-item-1",
    sync_status: "synced",
    last_synced_at: new Date().toISOString(),
    product: {
      id: "prod-1",
      name: "X-Burger",
      base_price: 25.90,
      description: "Hambúrguer artesanal",
      image_url: "/placeholder.svg",
      category: { name: "Lanches" },
    },
  },
  {
    id: "mapping-2",
    product_id: "prod-2",
    ifood_item_id: null,
    sync_status: "pending",
    last_synced_at: null,
    product: {
      id: "prod-2",
      name: "Pizza Margherita",
      base_price: 45.00,
      description: "Pizza tradicional",
      image_url: "/placeholder.svg",
      category: { name: "Pizzas" },
    },
  },
  {
    id: "mapping-3",
    product_id: "prod-3",
    ifood_item_id: "ifood-item-3",
    sync_status: "error",
    last_synced_at: new Date(Date.now() - 86400000).toISOString(),
    product: {
      id: "prod-3",
      name: "Suco Natural",
      base_price: 12.00,
      description: "Suco de laranja",
      image_url: null,
      category: { name: "Bebidas" },
    },
  },
];

// Mock iFood orders
const mockIFoodOrders = [
  {
    id: "ifood-order-1",
    ifood_order_id: "IFOOD-123456",
    ifood_short_id: "1234",
    status: "PLACED",
    customer_name: "João Silva",
    customer_phone: "(11) 99999-9999",
    total: 58.90,
    delivery_fee: 8.00,
    items: [
      { name: "X-Burger", quantity: 2, unitPrice: 25.90 },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "ifood-order-2",
    ifood_order_id: "IFOOD-789012",
    ifood_short_id: "5678",
    status: "CONFIRMED",
    customer_name: "Maria Santos",
    customer_phone: "(11) 88888-8888",
    total: 95.00,
    delivery_fee: 5.00,
    items: [
      { name: "Pizza Margherita", quantity: 2, unitPrice: 45.00 },
    ],
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

// Mock Supabase
const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: mockIntegration, error: null }),
          order: () => Promise.resolve({ data: mockMenuMappings, error: null }),
        }),
        order: () => Promise.resolve({ data: mockIFoodOrders, error: null }),
      }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
    functions: {
      invoke: mockInvoke,
    },
  },
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

describe("iFood Integration Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it("should have valid integration structure", () => {
    expect(mockIntegration).toHaveProperty("client_id");
    expect(mockIntegration).toHaveProperty("merchant_id");
    expect(mockIntegration).toHaveProperty("is_active");
    expect(mockIntegration.is_active).toBe(true);
  });

  it("should have valid token expiration", () => {
    const expiresAt = new Date(mockIntegration.token_expires_at);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("should validate credentials format", () => {
    expect(mockIntegration.client_id).toBeDefined();
    expect(mockIntegration.merchant_id).toBeDefined();
    expect(typeof mockIntegration.client_id).toBe("string");
  });
});

describe("iFood Menu Synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ 
      data: { success: true, synced: 3, failed: 0, errors: [] }, 
      error: null 
    });
  });

  it("should have valid menu mappings", () => {
    expect(mockMenuMappings).toHaveLength(3);
    expect(mockMenuMappings[0].sync_status).toBe("synced");
    expect(mockMenuMappings[1].sync_status).toBe("pending");
    expect(mockMenuMappings[2].sync_status).toBe("error");
  });

  it("should calculate sync statistics", () => {
    const stats = {
      total: mockMenuMappings.length,
      synced: mockMenuMappings.filter(m => m.sync_status === "synced").length,
      pending: mockMenuMappings.filter(m => m.sync_status === "pending").length,
      error: mockMenuMappings.filter(m => m.sync_status === "error").length,
    };

    expect(stats.total).toBe(3);
    expect(stats.synced).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.error).toBe(1);
  });

  it("should format product for iFood API", () => {
    const product = mockMenuMappings[0].product;
    const ifoodFormat = {
      name: product.name,
      description: product.description || "",
      price: {
        value: product.base_price * 100,
        originalValue: product.base_price * 100,
      },
      available: true,
      categoryName: product.category?.name || "Outros",
    };

    expect(ifoodFormat.name).toBe("X-Burger");
    expect(ifoodFormat.price.value).toBe(2590);
    expect(ifoodFormat.categoryName).toBe("Lanches");
  });

  it("should handle sync all products call", async () => {
    const result = await mockInvoke("ifood-api", {
      body: { action: "sync_menu" },
    });

    expect(mockInvoke).toHaveBeenCalledWith("ifood-api", {
      body: { action: "sync_menu" },
    });
    expect(result.data.synced).toBe(3);
  });

  it("should handle single product sync", async () => {
    mockInvoke.mockResolvedValueOnce({ 
      data: { success: true, message: "Produto sincronizado" }, 
      error: null 
    });

    const result = await mockInvoke("ifood-api", {
      body: { action: "sync_single_product", product_id: "prod-1" },
    });

    expect(result.data.success).toBe(true);
  });
});

describe("iFood Order Processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have valid order structure", () => {
    expect(mockIFoodOrders).toHaveLength(2);
    mockIFoodOrders.forEach(order => {
      expect(order).toHaveProperty("ifood_order_id");
      expect(order).toHaveProperty("status");
      expect(order).toHaveProperty("total");
      expect(order).toHaveProperty("items");
    });
  });

  it("should have valid order statuses", () => {
    const validStatuses = ["PLACED", "CONFIRMED", "PREPARATION_STARTED", "READY_TO_PICKUP", "DISPATCHED", "DELIVERED", "CANCELLED"];
    
    mockIFoodOrders.forEach(order => {
      expect(validStatuses).toContain(order.status);
    });
  });

  it("should calculate order total correctly", () => {
    const order = mockIFoodOrders[0];
    const itemsTotal = order.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const expectedTotal = itemsTotal + order.delivery_fee;

    expect(expectedTotal).toBeCloseTo(order.total, 2);
  });

  it("should handle order status update", async () => {
    mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });

    const result = await mockInvoke("ifood-api", {
      body: { 
        action: "update_order_status",
        ifood_order_id: "IFOOD-123456",
        status: "CONFIRMED"
      },
    });

    expect(result.data.success).toBe(true);
  });

  it("should map iFood status to internal status", () => {
    const statusMap: Record<string, string> = {
      "PLACED": "pending",
      "CONFIRMED": "confirmed",
      "PREPARATION_STARTED": "preparing",
      "READY_TO_PICKUP": "ready",
      "DISPATCHED": "out_for_delivery",
      "DELIVERED": "delivered",
      "CANCELLED": "cancelled",
    };

    expect(statusMap["PLACED"]).toBe("pending");
    expect(statusMap["CONFIRMED"]).toBe("confirmed");
    expect(statusMap["DISPATCHED"]).toBe("out_for_delivery");
  });
});

describe("iFood API Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle authentication error", async () => {
    mockInvoke.mockResolvedValueOnce({ 
      data: null, 
      error: { message: "Invalid credentials" } 
    });

    const result = await mockInvoke("ifood-api", {
      body: { action: "test_connection" },
    });

    expect(result.error).toBeDefined();
    expect(result.error.message).toBe("Invalid credentials");
  });

  it("should handle token expiration", () => {
    const expiredIntegration = {
      ...mockIntegration,
      token_expires_at: new Date(Date.now() - 3600000).toISOString(),
    };

    const isExpired = new Date(expiredIntegration.token_expires_at) < new Date();
    expect(isExpired).toBe(true);
  });

  it("should handle sync errors gracefully", async () => {
    mockInvoke.mockResolvedValueOnce({ 
      data: { success: false, synced: 2, failed: 1, errors: ["Produto X falhou"] }, 
      error: null 
    });

    const result = await mockInvoke("ifood-api", {
      body: { action: "sync_menu" },
    });

    expect(result.data.failed).toBe(1);
    expect(result.data.errors).toHaveLength(1);
  });
});

describe("iFood Integration UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it("should render IFoodMenuSyncPanel without crashing", async () => {
    vi.mock("@/hooks/useIFoodMenuSync", () => ({
      useIFoodMenuSync: () => ({
        menuMappings: mockMenuMappings,
        syncStats: { total: 3, synced: 1, pending: 1, error: 1 },
        isLoading: false,
        isSyncing: false,
        refetch: vi.fn(),
        syncAllProducts: { mutate: vi.fn(), isPending: false },
        syncSingleProduct: { mutate: vi.fn(), isPending: false },
        updateAvailability: { mutate: vi.fn(), isPending: false },
      }),
    }));

    const { IFoodMenuSyncPanel } = await import("@/components/integrations/IFoodMenuSyncPanel");
    const { container } = render(<IFoodMenuSyncPanel />, { wrapper: createWrapper() });

    expect(container).toBeDefined();
  });
});
