import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, subDays } from 'date-fns';

interface ComparisonData {
  yesterday: number;
  today: number;
  percentChange: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function YesterdayComparisonCard() {
  const { tenantId } = useAuth();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchComparison = async () => {
      if (!tenantId) return;

      try {
        const today = new Date();
        const yesterday = subDays(today, 1);

        // Fetch today's sales
        const { data: todayPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('status', 'approved')
          .gte('paid_at', startOfDay(today).toISOString())
          .lte('paid_at', endOfDay(today).toISOString());

        // Fetch yesterday's sales
        const { data: yesterdayPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('status', 'approved')
          .gte('paid_at', startOfDay(yesterday).toISOString())
          .lte('paid_at', endOfDay(yesterday).toISOString());

        const todayTotal = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const yesterdayTotal = yesterdayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        const percentChange = yesterdayTotal > 0 
          ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 
          : todayTotal > 0 ? 100 : 0;

        setData({
          yesterday: yesterdayTotal,
          today: todayTotal,
          percentChange,
        });
      } catch (error) {
        console.error('Error fetching comparison:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComparison();
  }, [tenantId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const TrendIcon = data.percentChange > 0 
    ? TrendingUp 
    : data.percentChange < 0 
    ? TrendingDown 
    : Minus;

  const trendColor = data.percentChange > 0 
    ? 'text-success' 
    : data.percentChange < 0 
    ? 'text-destructive' 
    : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Comparativo com Ontem
        </CardTitle>
        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Ontem</span>
            <span className="font-medium">{formatCurrency(data.yesterday)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Hoje</span>
            <span className="font-bold text-primary">{formatCurrency(data.today)}</span>
          </div>
          <div className="pt-2 border-t">
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="font-semibold">
                {data.percentChange > 0 ? '+' : ''}{data.percentChange.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground ml-1">
                {data.percentChange > 0 ? 'acima' : data.percentChange < 0 ? 'abaixo' : 'igual'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
