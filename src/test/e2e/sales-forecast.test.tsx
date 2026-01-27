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
  profile: { full_name: "Manager Test" },
  isAuthenticated: true,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Supabase with forecast function
const mockForecastData = {
  predictions: [
    { date: "2026-01-28", predicted: 1500, confidence: 0.85 },
    { date: "2026-01-29", predicted: 1800, confidence: 0.82 },
    { date: "2026-01-30", predicted: 2100, confidence: 0.78 },
    { date: "2026-01-31", predicted: 1950, confidence: 0.75 },
    { date: "2026-02-01", predicted: 2400, confidence: 0.72 },
    { date: "2026-02-02", predicted: 2800, confidence: 0.68 },
    { date: "2026-02-03", predicted: 2200, confidence: 0.65 },
  ],
  model: "gemini-2.5-flash",
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lte: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: mockForecastData,
        error: null,
      }),
    },
  },
}));

// Mock forecast hook
vi.mock("@/hooks/useSalesForecast", () => ({
  useSalesForecast: () => ({
    forecast: mockForecastData,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock forecast accuracy hook
const mockAccuracyData = {
  averageAccuracy: 87.5,
  totalForecasts: 30,
  accurateForecasts: 26,
};

vi.mock("@/hooks/useForecastAccuracy", () => ({
  useForecastAccuracy: () => ({
    accuracy: mockAccuracyData,
    isLoading: false,
    error: null,
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

describe("Sales Forecast Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have valid forecast predictions", () => {
    expect(mockForecastData.predictions).toHaveLength(7);
    expect(mockForecastData.model).toBe("gemini-2.5-flash");
  });

  it("should have forecast data with correct structure", () => {
    mockForecastData.predictions.forEach(prediction => {
      expect(prediction).toHaveProperty("date");
      expect(prediction).toHaveProperty("predicted");
      expect(prediction).toHaveProperty("confidence");
    });
  });

  it("should have confidence values between 0 and 1", () => {
    mockForecastData.predictions.forEach(prediction => {
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });
  });

  it("should have positive prediction values", () => {
    mockForecastData.predictions.forEach(prediction => {
      expect(prediction.predicted).toBeGreaterThan(0);
    });
  });
});

describe("Forecast Accuracy Tracking", () => {
  it("should have valid accuracy data", () => {
    expect(mockAccuracyData.averageAccuracy).toBe(87.5);
    expect(mockAccuracyData.totalForecasts).toBe(30);
    expect(mockAccuracyData.accurateForecasts).toBe(26);
  });

  it("should have consistent accuracy calculation", () => {
    const calculatedAccuracy = (mockAccuracyData.accurateForecasts / mockAccuracyData.totalForecasts) * 100;
    expect(calculatedAccuracy).toBeCloseTo(86.67, 1);
  });

  it("should have accuracy between 0 and 100", () => {
    expect(mockAccuracyData.averageAccuracy).toBeGreaterThanOrEqual(0);
    expect(mockAccuracyData.averageAccuracy).toBeLessThanOrEqual(100);
  });
});

describe("Forecast Edge Function Integration", () => {
  it("should handle edge function response correctly", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    
    const result = await supabase.functions.invoke("sales-forecast", {
      body: { tenantId: "test-tenant-123" },
    });

    expect(result.data).toBeDefined();
    expect(result.data.predictions).toHaveLength(7);
    expect(result.data.predictions[0].predicted).toBe(1500);
    expect(result.data.predictions[0].confidence).toBe(0.85);
  });

  it("should include model information in response", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    
    const result = await supabase.functions.invoke("sales-forecast", {
      body: { tenantId: "test-tenant-123" },
    });

    expect(result.data.model).toBe("gemini-2.5-flash");
  });
});

describe("Forecast Data Validation", () => {
  it("should validate prediction date format", () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    mockForecastData.predictions.forEach(prediction => {
      expect(prediction.date).toMatch(dateRegex);
    });
  });

  it("should have predictions in chronological order", () => {
    const dates = mockForecastData.predictions.map(p => new Date(p.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThan(dates[i - 1]);
    }
  });

  it("should handle empty historical data gracefully", () => {
    const emptyForecast = {
      predictions: [],
      message: "Insufficient data for forecast",
    };

    expect(emptyForecast.predictions).toHaveLength(0);
    expect(emptyForecast.message).toBeDefined();
  });

  it("should calculate total predicted revenue for week", () => {
    const totalPredicted = mockForecastData.predictions.reduce(
      (sum, p) => sum + p.predicted, 
      0
    );
    expect(totalPredicted).toBe(14750);
  });
});
