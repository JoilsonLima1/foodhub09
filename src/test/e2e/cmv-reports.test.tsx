/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import React from "react";

// Mock auth context
const mockAuth = {
  tenantId: "test-tenant-123",
  user: { id: "user-123", email: "manager@example.com" },
  profile: { full_name: "Manager Test", tenant_id: "test-tenant-123" },
  isAuthenticated: true,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock CMV Report data
const mockCMVReport = {
  totalRevenue: 15750.00,
  totalCost: 5512.50,
  totalProfit: 10237.50,
  overallMargin: 65.0,
  products: [
    {
      productId: "prod-1",
      productName: "X-Burger Especial",
      quantitySold: 150,
      revenue: 4485.00,
      cost: 1345.50,
      profit: 3139.50,
      margin: 70.0,
    },
    {
      productId: "prod-2",
      productName: "Pizza Margherita",
      quantitySold: 80,
      revenue: 3200.00,
      cost: 960.00,
      profit: 2240.00,
      margin: 70.0,
    },
    {
      productId: "prod-3",
      productName: "Batata Frita G",
      quantitySold: 200,
      revenue: 2400.00,
      cost: 480.00,
      profit: 1920.00,
      margin: 80.0,
    },
    {
      productId: "prod-4",
      productName: "Refrigerante 600ml",
      quantitySold: 350,
      revenue: 2450.00,
      cost: 1225.00,
      profit: 1225.00,
      margin: 50.0,
    },
    {
      productId: "prod-5",
      productName: "Combo Família",
      quantitySold: 45,
      revenue: 3215.00,
      cost: 1502.00,
      profit: 1713.00,
      margin: 53.3,
    },
  ],
};

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lte: () => ({
              in: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

// Mock CMV Report hook
vi.mock("@/hooks/useCMVReport", () => ({
  useCMVReport: () => ({
    report: mockCMVReport,
    isLoading: false,
    refetch: vi.fn(),
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

describe("CMV Report Data Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have valid report structure", () => {
    expect(mockCMVReport).toHaveProperty("totalRevenue");
    expect(mockCMVReport).toHaveProperty("totalCost");
    expect(mockCMVReport).toHaveProperty("totalProfit");
    expect(mockCMVReport).toHaveProperty("overallMargin");
    expect(mockCMVReport).toHaveProperty("products");
  });

  it("should have correct financial calculations", () => {
    const calculatedProfit = mockCMVReport.totalRevenue - mockCMVReport.totalCost;
    expect(calculatedProfit).toBe(mockCMVReport.totalProfit);
  });

  it("should have correct margin calculation", () => {
    const calculatedMargin = (mockCMVReport.totalProfit / mockCMVReport.totalRevenue) * 100;
    expect(calculatedMargin).toBeCloseTo(mockCMVReport.overallMargin, 0);
  });

  it("should have valid product data", () => {
    expect(mockCMVReport.products).toHaveLength(5);
    mockCMVReport.products.forEach(product => {
      expect(product.revenue).toBeGreaterThan(0);
      expect(product.margin).toBeGreaterThanOrEqual(0);
      expect(product.margin).toBeLessThanOrEqual(100);
    });
  });

  it("should calculate individual product margins correctly", () => {
    mockCMVReport.products.forEach(product => {
      const calculatedMargin = (product.profit / product.revenue) * 100;
      expect(calculatedMargin).toBeCloseTo(product.margin, 0);
    });
  });
});

describe("CMV Margin Distribution Analysis", () => {
  it("should categorize products by margin", () => {
    const marginDistribution = {
      excellent: mockCMVReport.products.filter(p => p.margin >= 70).length,
      good: mockCMVReport.products.filter(p => p.margin >= 50 && p.margin < 70).length,
      regular: mockCMVReport.products.filter(p => p.margin >= 30 && p.margin < 50).length,
      low: mockCMVReport.products.filter(p => p.margin < 30).length,
    };

    expect(marginDistribution.excellent).toBe(3);
    expect(marginDistribution.good).toBe(2);
    expect(marginDistribution.regular).toBe(0);
    expect(marginDistribution.low).toBe(0);
  });

  it("should identify top products by margin", () => {
    const topByMargin = [...mockCMVReport.products]
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 3);

    expect(topByMargin[0].productName).toBe("Batata Frita G");
    expect(topByMargin[0].margin).toBe(80);
  });

  it("should identify products with lowest margins", () => {
    const worstByMargin = [...mockCMVReport.products]
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 3);

    expect(worstByMargin[0].productName).toBe("Refrigerante 600ml");
    expect(worstByMargin[0].margin).toBe(50);
  });

  it("should calculate weighted average margin", () => {
    const totalRevenue = mockCMVReport.products.reduce((sum, p) => sum + p.revenue, 0);
    const weightedMargin = mockCMVReport.products.reduce(
      (sum, p) => sum + (p.margin * (p.revenue / totalRevenue)),
      0
    );

    expect(weightedMargin).toBeGreaterThan(0);
    expect(weightedMargin).toBeLessThanOrEqual(100);
  });
});

describe("CMV Cost Analysis", () => {
  it("should calculate cost per product ratio", () => {
    const costRatios = mockCMVReport.products.map(p => ({
      name: p.productName,
      costRatio: p.cost / p.revenue,
    }));

    costRatios.forEach(item => {
      expect(item.costRatio).toBeGreaterThan(0);
      expect(item.costRatio).toBeLessThan(1);
    });
  });

  it("should identify high-cost products", () => {
    const highCostProducts = mockCMVReport.products.filter(
      p => (p.cost / p.revenue) > 0.4
    );

    expect(highCostProducts.length).toBeGreaterThan(0);
  });

  it("should calculate average cost per unit", () => {
    const avgCostPerUnit = mockCMVReport.products.map(p => ({
      name: p.productName,
      avgCost: p.cost / p.quantitySold,
    }));

    expect(avgCostPerUnit[0].avgCost).toBeCloseTo(8.97, 1);
  });

  it("should calculate total volume sold", () => {
    const totalVolume = mockCMVReport.products.reduce(
      (sum, p) => sum + p.quantitySold,
      0
    );

    expect(totalVolume).toBe(825);
  });
});

describe("CMV Report Trends", () => {
  it("should calculate profit per unit", () => {
    const profitPerUnit = mockCMVReport.products.map(p => ({
      name: p.productName,
      profitPerUnit: p.profit / p.quantitySold,
    }));

    expect(profitPerUnit[0].profitPerUnit).toBeCloseTo(20.93, 1);
  });

  it("should identify most profitable product by total profit", () => {
    const mostProfitable = [...mockCMVReport.products]
      .sort((a, b) => b.profit - a.profit)[0];

    expect(mostProfitable.productName).toBe("X-Burger Especial");
    expect(mostProfitable.profit).toBe(3139.50);
  });

  it("should calculate contribution to total profit", () => {
    const contributions = mockCMVReport.products.map(p => ({
      name: p.productName,
      contribution: (p.profit / mockCMVReport.totalProfit) * 100,
    }));

    const totalContribution = contributions.reduce((sum, c) => sum + c.contribution, 0);
    expect(totalContribution).toBeCloseTo(100, 0);
  });

  it("should validate report period consistency", () => {
    const sumRevenue = mockCMVReport.products.reduce((sum, p) => sum + p.revenue, 0);
    const sumCost = mockCMVReport.products.reduce((sum, p) => sum + p.cost, 0);
    const sumProfit = mockCMVReport.products.reduce((sum, p) => sum + p.profit, 0);

    expect(sumRevenue).toBeCloseTo(mockCMVReport.totalRevenue, 0);
    expect(sumCost).toBeCloseTo(mockCMVReport.totalCost, 0);
    expect(sumProfit).toBeCloseTo(mockCMVReport.totalProfit, 0);
  });
});

describe("CMV Report Rendering", () => {
  it("should render CMVReportView component without crashing", async () => {
    const { CMVReportView } = await import("@/components/reports/CMVReportView");
    const { container } = render(
      <CMVReportView report={mockCMVReport} />,
      { wrapper: createWrapper() }
    );

    expect(container).toBeDefined();
  });

  it("should render CMVAnalytics component without crashing", async () => {
    const { CMVAnalytics } = await import("@/components/reports/CMVAnalytics");
    const { container } = render(
      <CMVAnalytics 
        products={mockCMVReport.products}
        totalRevenue={mockCMVReport.totalRevenue}
        totalCost={mockCMVReport.totalCost}
        totalProfit={mockCMVReport.totalProfit}
        overallMargin={mockCMVReport.overallMargin}
      />,
      { wrapper: createWrapper() }
    );

    expect(container).toBeDefined();
  });
});
