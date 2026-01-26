import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';
import { toast } from 'sonner';

interface SalesGoal {
  id: string;
  goal_type: 'daily' | 'weekly';
  target_amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface GoalProgress {
  goal: SalesGoal | null;
  currentAmount: number;
  percentage: number;
  remaining: number;
}

export function useSalesGoals() {
  const { tenantId, user } = useAuth();
  const [dailyGoal, setDailyGoal] = useState<GoalProgress>({
    goal: null,
    currentAmount: 0,
    percentage: 0,
    remaining: 0,
  });
  const [weeklyGoal, setWeeklyGoal] = useState<GoalProgress>({
    goal: null,
    currentAmount: 0,
    percentage: 0,
    remaining: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Track previous percentages to detect goal achievement
  const prevDailyPercentage = useRef<number>(0);
  const prevWeeklyPercentage = useRef<number>(0);

  // Send notification when goal is achieved
  const sendGoalNotification = useCallback(async (
    goalId: string,
    goalType: 'daily' | 'weekly',
    targetAmount: number,
    achievedAmount: number
  ) => {
    if (!tenantId) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      console.log('Enviando notificação de meta atingida:', { goalId, goalType, targetAmount, achievedAmount });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-goal-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            goalId,
            goalType,
            targetAmount,
            achievedAmount,
            tenantId,
          }),
        }
      );

      const result = await response.json();
      if (result.success && result.recipients?.length > 0) {
        toast.success('🎉 Meta atingida! Notificação enviada para gestores.');
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  }, [tenantId]);

  const fetchGoalsAndProgress = useCallback(async () => {
    if (!tenantId) return;

    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Fetch active goals
      const { data: goals } = await supabase
        .from('sales_goals')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .or(`and(goal_type.eq.daily,start_date.lte.${todayStr},end_date.gte.${todayStr}),and(goal_type.eq.weekly,start_date.lte.${todayStr},end_date.gte.${todayStr})`);

      const dailyGoalData = goals?.find(g => g.goal_type === 'daily') || null;
      const weeklyGoalData = goals?.find(g => g.goal_type === 'weekly') || null;

      // Fetch today's sales
      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .gte('paid_at', startOfDay(today).toISOString())
        .lte('paid_at', endOfDay(today).toISOString());

      const todayTotal = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fetch week's sales
      const { data: weekPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .gte('paid_at', startOfWeek(today, { weekStartsOn: 1 }).toISOString())
        .lte('paid_at', endOfWeek(today, { weekStartsOn: 1 }).toISOString());

      const weekTotal = weekPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Calculate daily progress and check for achievement
      if (dailyGoalData) {
        const target = Number(dailyGoalData.target_amount);
        const percentage = target > 0 ? Math.min((todayTotal / target) * 100, 100) : 0;
        
        // Check if goal was just achieved (crossed 100%)
        if (prevDailyPercentage.current < 100 && percentage >= 100) {
          sendGoalNotification(dailyGoalData.id, 'daily', target, todayTotal);
        }
        prevDailyPercentage.current = percentage;

        setDailyGoal({
          goal: dailyGoalData as SalesGoal,
          currentAmount: todayTotal,
          percentage,
          remaining: Math.max(target - todayTotal, 0),
        });
      } else {
        prevDailyPercentage.current = 0;
        setDailyGoal({ goal: null, currentAmount: todayTotal, percentage: 0, remaining: 0 });
      }

      // Calculate weekly progress and check for achievement
      if (weeklyGoalData) {
        const target = Number(weeklyGoalData.target_amount);
        const percentage = target > 0 ? Math.min((weekTotal / target) * 100, 100) : 0;
        
        // Check if goal was just achieved (crossed 100%)
        if (prevWeeklyPercentage.current < 100 && percentage >= 100) {
          sendGoalNotification(weeklyGoalData.id, 'weekly', target, weekTotal);
        }
        prevWeeklyPercentage.current = percentage;

        setWeeklyGoal({
          goal: weeklyGoalData as SalesGoal,
          currentAmount: weekTotal,
          percentage,
          remaining: Math.max(target - weekTotal, 0),
        });
      } else {
        prevWeeklyPercentage.current = 0;
        setWeeklyGoal({ goal: null, currentAmount: weekTotal, percentage: 0, remaining: 0 });
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, sendGoalNotification]);

  const createGoal = useCallback(async (
    goalType: 'daily' | 'weekly',
    targetAmount: number
  ) => {
    if (!tenantId || !user) return;

    try {
      const today = new Date();
      let startDate: Date;
      let endDate: Date;

      if (goalType === 'daily') {
        startDate = startOfDay(today);
        endDate = endOfDay(today);
      } else {
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        endDate = endOfWeek(today, { weekStartsOn: 1 });
      }

      // Deactivate existing goals of this type
      await supabase
        .from('sales_goals')
        .update({ is_active: false })
        .eq('tenant_id', tenantId)
        .eq('goal_type', goalType)
        .eq('is_active', true);

      // Create new goal
      const { error } = await supabase
        .from('sales_goals')
        .insert({
          tenant_id: tenantId,
          goal_type: goalType,
          target_amount: targetAmount,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          created_by: user.id,
        });

      if (error) throw error;

      toast.success(`Meta ${goalType === 'daily' ? 'diária' : 'semanal'} definida!`);
      fetchGoalsAndProgress();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Erro ao criar meta');
    }
  }, [tenantId, user, fetchGoalsAndProgress]);

  useEffect(() => {
    fetchGoalsAndProgress();

    // Refresh every 5 minutes
    const interval = setInterval(fetchGoalsAndProgress, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchGoalsAndProgress]);

  // Listen for payment updates
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('goals-payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchGoalsAndProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchGoalsAndProgress]);

  return {
    dailyGoal,
    weeklyGoal,
    isLoading,
    createGoal,
    refetch: fetchGoalsAndProgress,
  };
}
