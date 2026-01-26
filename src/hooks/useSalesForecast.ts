import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ForecastDay {
  date: string;
  predictedAmount: number;
  confidence: number;
  dayOfWeek: string;
}

interface ForecastResult {
  forecast: ForecastDay[];
  trend: 'growing' | 'declining' | 'stable';
  analysis: string;
  weeklyPrediction: number;
  historicalAverage: number;
  isSimpleForecast?: boolean;
}

export function useSalesForecast() {
  const { tenantId } = useAuth();
  const [data, setData] = useState<ForecastResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchForecast = useCallback(async (force = false) => {
    if (!tenantId) return;

    // Cache de 30 minutos, exceto se forçado
    if (!force && lastFetched && data) {
      const diffMinutes = (Date.now() - lastFetched.getTime()) / 60000;
      if (diffMinutes < 30) {
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Sessão não encontrada');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-forecast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ tenantId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar previsão');
      }

      const result = await response.json();

      if (result.success) {
        setData({
          forecast: result.forecast || [],
          trend: result.trend || 'stable',
          analysis: result.analysis || '',
          weeklyPrediction: result.weeklyPrediction || 0,
          historicalAverage: result.historicalAverage || 0,
          isSimpleForecast: result.isSimpleForecast || false,
        });
        setLastFetched(new Date());
      } else {
        setError(result.message || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Erro ao buscar previsão:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar previsão');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, lastFetched, data]);

  useEffect(() => {
    if (tenantId) {
      fetchForecast();
    }
  }, [tenantId]); // Não incluir fetchForecast para evitar loop

  return {
    forecast: data?.forecast || [],
    trend: data?.trend || 'stable',
    analysis: data?.analysis || '',
    weeklyPrediction: data?.weeklyPrediction || 0,
    historicalAverage: data?.historicalAverage || 0,
    isSimpleForecast: data?.isSimpleForecast || false,
    isLoading,
    error,
    refetch: () => fetchForecast(true),
  };
}
