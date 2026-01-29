import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TrialNotificationSettings {
  days_before_expiration: number;
  show_frequency_hours: number;
  banner_image_url: string | null;
  banner_type: 'info' | 'warning' | 'critical';
  show_expiration_datetime: boolean;
}

export interface SubscriptionStatus {
  isSubscribed: boolean;
  isTrialing: boolean;
  trialEndDate: string | null;
  currentPeriodEnd: string | null;
  planId: string | null;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'none' | 'expired';
}

export function useTrialStatus() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  // Fetch subscription status from Stripe via edge function
  const { data: subscriptionStatus, isLoading: isLoadingSubscription, refetch: refetchSubscription, error: subscriptionError } = useQuery({
    queryKey: ['subscription-status', user?.id],
    queryFn: async (): Promise<SubscriptionStatus> => {
      if (!session?.access_token) {
        return {
          isSubscribed: false,
          isTrialing: false,
          trialEndDate: null,
          currentPeriodEnd: null,
          planId: null,
          status: 'none',
        };
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        throw error; // Let React Query handle retry
      }

      return {
        isSubscribed: data.subscribed || false,
        isTrialing: data.is_trialing || false,
        trialEndDate: data.trial_end || null,
        currentPeriodEnd: data.subscription_end || null,
        planId: data.product_id || null,
        status: data.status || 'none',
      };
    },
    enabled: !!user && !!session,
    retry: 2, // Retry 2 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Fetch trial notification settings (super admin configurable)
  const { data: notificationSettings } = useQuery({
    queryKey: ['trial-notification-settings'],
    queryFn: async (): Promise<TrialNotificationSettings> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'trial_notifications')
        .single();

      if (error || !data) {
        return {
          days_before_expiration: 3,
          show_frequency_hours: 24,
          banner_image_url: null,
          banner_type: 'warning',
          show_expiration_datetime: true,
        };
      }

      return data.setting_value as unknown as TrialNotificationSettings;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Check if user has dismissed the notification recently
  const { data: dismissalInfo } = useQuery({
    queryKey: ['trial-dismissal', user?.id, subscriptionStatus?.trialEndDate],
    queryFn: async () => {
      if (!user || !subscriptionStatus?.trialEndDate) return null;

      const { data, error } = await supabase
        .from('trial_notification_dismissals')
        .select('dismissed_at')
        .eq('user_id', user.id)
        .eq('trial_end_date', subscriptionStatus.trialEndDate)
        .order('dismissed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching dismissal:', error);
        return null;
      }

      return data;
    },
    enabled: !!user && !!subscriptionStatus?.trialEndDate,
  });

  // Dismiss notification mutation
  const dismissNotification = useMutation({
    mutationFn: async () => {
      if (!user || !subscriptionStatus?.trialEndDate) {
        throw new Error('Missing user or trial end date');
      }

      const { error } = await supabase
        .from('trial_notification_dismissals')
        .upsert({
          user_id: user.id,
          trial_end_date: subscriptionStatus.trialEndDate,
          dismissed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,trial_end_date',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-dismissal'] });
    },
  });

  // Calculate if we should show the notification
  const shouldShowNotification = (): boolean => {
    if (!subscriptionStatus?.isTrialing || !subscriptionStatus.trialEndDate) {
      return false;
    }

    const trialEnd = new Date(subscriptionStatus.trialEndDate);
    const now = new Date();
    const daysUntilExpiration = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check if we're within the notification window
    const daysBeforeExpiration = notificationSettings?.days_before_expiration ?? 3;
    if (daysUntilExpiration > daysBeforeExpiration) {
      return false;
    }

    // Check if notification was dismissed recently
    if (dismissalInfo?.dismissed_at) {
      const dismissedAt = new Date(dismissalInfo.dismissed_at);
      const hoursSinceDismissal = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60);
      const frequencyHours = notificationSettings?.show_frequency_hours ?? 24;

      if (hoursSinceDismissal < frequencyHours) {
        return false;
      }
    }

    return true;
  };

  // Format expiration date/time
  const getExpirationDisplay = (): string => {
    if (!subscriptionStatus?.trialEndDate) return '';

    const trialEnd = new Date(subscriptionStatus.trialEndDate);
    const showDateTime = notificationSettings?.show_expiration_datetime ?? true;

    if (showDateTime) {
      return trialEnd.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return trialEnd.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Calculate days remaining
  const getDaysRemaining = (): number => {
    if (!subscriptionStatus?.trialEndDate) return 0;

    const trialEnd = new Date(subscriptionStatus.trialEndDate);
    const now = new Date();
    return Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  return {
    subscriptionStatus,
    notificationSettings,
    isLoading: isLoadingSubscription,
    error: subscriptionError,
    shouldShowNotification: shouldShowNotification(),
    dismissNotification,
    getExpirationDisplay,
    getDaysRemaining,
    refetchSubscription,
  };
}
