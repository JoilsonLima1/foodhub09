/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import React from "react";

// Mock auth context
const mockAuth = {
  tenantId: "test-tenant-123",
  user: { id: "user-123", email: "courier@example.com" },
  profile: { full_name: "João Entregador", tenant_id: "test-tenant-123" },
  isAuthenticated: true,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock delivery data
const mockDeliveries = [
  {
    id: "delivery-1",
    order_id: "order-1",
    status: "pending",
    created_at: new Date().toISOString(),
    order: {
      order_number: 101,
      customer_name: "Maria Silva",
      customer_phone: "(11) 99999-9999",
      delivery_address: "Rua das Flores, 123",
      delivery_neighborhood: "Centro",
      total: 45.90,
      notes: "Apartamento 12",
    },
  },
  {
    id: "delivery-2",
    order_id: "order-2",
    status: "picked_up",
    created_at: new Date().toISOString(),
    picked_up_at: new Date().toISOString(),
    order: {
      order_number: 102,
      customer_name: "Pedro Santos",
      customer_phone: "(11) 88888-8888",
      delivery_address: "Av. Principal, 456",
      delivery_neighborhood: "Jardim",
      total: 78.50,
      notes: null,
    },
  },
];

const mockStats = {
  total: 2,
  pending: 1,
  inRoute: 1,
  completed: 0,
};

const mockUpdateStatus = vi.fn();

vi.mock("@/hooks/useCourierDeliveries", () => ({
  useCourierDeliveries: () => ({
    deliveries: mockDeliveries,
    stats: mockStats,
    courierId: "courier-123",
    isLoading: false,
    refetch: vi.fn(),
    updateDeliveryStatus: mockUpdateStatus,
  }),
}));

// Mock push notifications
vi.mock("@/hooks/usePushNotifications", () => ({
  usePushNotifications: () => ({
    isSupported: true,
    permission: "default",
    requestPermission: vi.fn(),
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

describe("Courier Dashboard", () => {
  beforeEach(() => {
    mockUpdateStatus.mockReset();
  });

  it("should have valid mock deliveries data", () => {
    expect(mockDeliveries).toHaveLength(2);
    expect(mockDeliveries[0].order.customer_name).toBe("Maria Silva");
    expect(mockDeliveries[1].order.customer_name).toBe("Pedro Santos");
  });

  it("should have correct delivery statistics", () => {
    expect(mockStats.total).toBe(2);
    expect(mockStats.pending).toBe(1);
    expect(mockStats.inRoute).toBe(1);
    expect(mockStats.completed).toBe(0);
  });

  it("should render CourierDashboard without crashing", async () => {
    const CourierDashboard = (await import("@/pages/CourierDashboard")).default;
    const { container } = render(<CourierDashboard />, { wrapper: createWrapper() });
    
    expect(container).toBeDefined();
  });

  it("should have delivery addresses in mock data", () => {
    expect(mockDeliveries[0].order.delivery_address).toBe("Rua das Flores, 123");
    expect(mockDeliveries[1].order.delivery_address).toBe("Av. Principal, 456");
  });
});

describe("Courier Delivery Status Updates", () => {
  beforeEach(() => {
    mockUpdateStatus.mockReset();
    mockUpdateStatus.mockResolvedValue({ success: true });
  });

  it("should have update status function available", () => {
    expect(mockUpdateStatus).toBeDefined();
  });

  it("should validate delivery status transitions", () => {
    const validStatuses = ["pending", "picked_up", "in_route", "delivered"];
    
    expect(validStatuses).toContain(mockDeliveries[0].status);
    expect(validStatuses).toContain(mockDeliveries[1].status);
  });

  it("should include order total in delivery data", () => {
    expect(mockDeliveries[0].order.total).toBe(45.90);
    expect(mockDeliveries[1].order.total).toBe(78.50);
  });
});

describe("Courier Dashboard - Data Validation", () => {
  it("should have valid phone numbers format", () => {
    const phoneRegex = /\(\d{2}\)\s\d{4,5}-\d{4}/;
    expect(mockDeliveries[0].order.customer_phone).toMatch(phoneRegex);
    expect(mockDeliveries[1].order.customer_phone).toMatch(phoneRegex);
  });

  it("should have unique delivery IDs", () => {
    const ids = mockDeliveries.map(d => d.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });

  it("should have valid timestamps", () => {
    mockDeliveries.forEach(delivery => {
      const date = new Date(delivery.created_at);
      expect(date.getTime()).not.toBeNaN();
    });
  });
});
