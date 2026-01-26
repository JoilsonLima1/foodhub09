import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, subDays, format } from 'date-fns';

interface ForecastAccuracyData {
  targetDate: string;
  predictedAmount: number;
  actualAmount: number;
  accuracyPercentage: number;
  dayOfWeek: string;
}

interface AccuracyStats {
  averageAccuracy: number;
  totalPredictions: number;
  accurateCount: number;
  data: ForecastAccuracyData[];
}

export function useForecastAccuracy() {
  const { tenantId } = useAuth();
  const [stats, setStats] = useState<AccuracyStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccuracy = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Buscar previsões que já passaram (target_date < hoje) e têm valor realizado
      const today = startOfDay(new Date());
      const thirtyDaysAgo = subDays(today, 30);

      const { data: forecasts, error: forecastError } = await supabase
        .from('sales_forecast_history')
        .select('*')
        .eq('tenant_id', tenantId)
        .lt('target_date', format(today, 'yyyy-MM-dd'))
        .gte('target_date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
        .not('actual_amount', 'is', null)
        .order('target_date', { ascending: false });

      if (forecastError) throw forecastError;

      if (!forecasts || forecasts.length === 0) {
        setStats({
          averageAccuracy: 0,
          totalPredictions: 0,
          accurateCount: 0,
          data: [],
        });
        return;
      }

      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      
      const data: ForecastAccuracyData[] = forecasts.map((f) => {
        const date = new Date(f.target_date);
        return {
          targetDate: f.target_date,
          predictedAmount: Number(f.predicted_amount),
          actualAmount: Number(f.actual_amount),
          accuracyPercentage: Number(f.accuracy_percentage) || 0,
          dayOfWeek: dayNames[date.getDay()],
        };
      });

      // Calcular estatísticas
      const totalAccuracy = data.reduce((sum, d) => sum + d.accuracyPercentage, 0);
      const averageAccuracy = data.length > 0 ? totalAccuracy / data.length : 0;
      const accurateCount = data.filter((d) => d.accuracyPercentage >= 80).length;

      setStats({
        averageAccuracy,
        totalPredictions: data.length,
        accurateCount,
        data,
      });
    } catch (err) {
      console.error('Erro ao buscar precisão:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Atualizar valores realizados para previsões passadas
  const updateActualValues = useCallback(async () => {
    if (!tenantId) return;

    try {
      const today = startOfDay(new Date());
      const sevenDaysAgo = subDays(today, 7);

      // Buscar previsões sem valor realizado
      const { data: pendingForecasts, error: pendingError } = await supabase
        .from('sales_forecast_history')
        .select('id, target_date')
        .eq('tenant_id', tenantId)
        .lt('target_date', format(today, 'yyyy-MM-dd'))
        .gte('target_date', format(sevenDaysAgo, 'yyyy-MM-dd'))
        .is('actual_amount', null);

      if (pendingError || !pendingForecasts?.length) return;

      // Para cada previsão pendente, buscar o valor real de vendas
      for (const forecast of pendingForecasts) {
        const targetDate = forecast.target_date;
        const nextDay = format(new Date(new Date(targetDate).getTime() + 86400000), 'yyyy-MM-dd');

        // Buscar vendas do dia
        const { data: payments, error: paymentError } = await supabase
          .from('payments')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('status', 'approved')
          .gte('paid_at', `${targetDate}T00:00:00`)
          .lt('paid_at', `${nextDay}T00:00:00`);

        if (paymentError) continue;

        const actualAmount = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        // Buscar o valor previsto para calcular precisão
        const { data: forecastData } = await supabase
          .from('sales_forecast_history')
          .select('predicted_amount')
          .eq('id', forecast.id)
          .single();

        if (!forecastData) continue;

        const predicted = Number(forecastData.predicted_amount);
        let accuracy = 0;
        
        if (predicted > 0 && actualAmount > 0) {
          const diff = Math.abs(predicted - actualAmount);
          const maxValue = Math.max(predicted, actualAmount);
          accuracy = Math.max(0, 100 - (diff / maxValue) * 100);
        } else if (predicted === 0 && actualAmount === 0) {
          accuracy = 100;
        }

        // Atualizar com valor real e precisão
        await supabase
          .from('sales_forecast_history')
          .update({
            actual_amount: actualAmount,
            accuracy_percentage: Math.round(accuracy * 100) / 100,
          })
          .eq('id', forecast.id);
      }

      // Recarregar dados
      fetchAccuracy();
    } catch (err) {
      console.error('Erro ao atualizar valores reais:', err);
    }
  }, [tenantId, fetchAccuracy]);

  useEffect(() => {
    if (tenantId) {
      updateActualValues();
      fetchAccuracy();
    }
  }, [tenantId]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchAccuracy,
  };
}
