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

export interface PaymentInfo {
  lastPaymentAt: string | null;
  lastPaymentMethod: string | null;
  lastPaymentProvider: string | null;
  lastPaymentStatus: string | null;
  asaasPaymentId: string | null;
}

export interface SubscriptionStatus {
  isSubscribed: boolean;
  isTrialing: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;
  totalTrialDays: number;
  daysUsed: number;
  daysRemaining: number;
  subscriptionStartDate: string | null;
  currentPeriodEnd: string | null;
  planId: string | null;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'none' | 'expired';
  tenantPlanId: string | null;
  tenantPlanName: string | null;
  hasContractedPlan: boolean;
  hasTrialBenefit: boolean;
  trialBenefitMessage: string | null;
  paymentInfo: PaymentInfo | null;
}

export function useTrialStatus() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  // Fetch subscription status from edge function
  const { data: subscriptionStatus, isLoading: isLoadingSubscription, refetch: refetchSubscription, error: subscriptionError } = useQuery({
    queryKey: ['subscription-status', user?.id],
    queryFn: async (): Promise<SubscriptionStatus> => {
      if (!session?.access_token) {
        return {
          isSubscribed: false,
          isTrialing: false,
          trialStartDate: null,
          trialEndDate: null,
          totalTrialDays: 14,
          daysUsed: 0,
          daysRemaining: 0,
          subscriptionStartDate: null,
          currentPeriodEnd: null,
          planId: null,
          status: 'none',
          tenantPlanId: null,
          tenantPlanName: null,
          hasContractedPlan: false,
          hasTrialBenefit: false,
          trialBenefitMessage: null,
          paymentInfo: null,
        };
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        throw error;
      }

      // SINGLE SOURCE OF TRUTH: Fetch tenant's subscription info from database
      // This is the primary source for displaying the contracted plan
      let tenantPlanId: string | null = null;
      let tenantPlanName: string | null = null;
      let tenantSubscriptionStatus: string | null = null;
      let paymentInfo: PaymentInfo | null = null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user!.id)
        .single();

      if (profile?.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select(`
            subscription_plan_id,
            subscription_status,
            last_payment_at,
            last_payment_method,
            last_payment_provider,
            last_payment_status,
            asaas_payment_id,
            asaas_customer_id
          `)
          .eq('id', profile.tenant_id)
          .single();
        
        tenantPlanId = tenant?.subscription_plan_id || null;
        tenantSubscriptionStatus = tenant?.subscription_status || null;

        // Fetch plan name if tenant has a plan (this is the single source of truth)
        if (tenantPlanId) {
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('name, slug')
            .eq('id', tenantPlanId)
            .single();
          
          tenantPlanName = planData?.name || null;
          console.log('[useTrialStatus] Tenant plan found:', { tenantPlanId, tenantPlanName, status: tenantSubscriptionStatus });
        }

        // Build payment info if available (from confirmed payment)
        if (tenant?.last_payment_at) {
          paymentInfo = {
            lastPaymentAt: tenant.last_payment_at,
            lastPaymentMethod: tenant.last_payment_method,
            lastPaymentProvider: tenant.last_payment_provider,
            lastPaymentStatus: tenant.last_payment_status,
            asaasPaymentId: tenant.asaas_payment_id,
          };
        }
      }

      // Determine hasContractedPlan: True if tenant has a subscription_plan_id set
      // This is independent of the status from edge function (Stripe)
      const hasContractedPlanFromTenant = !!tenantPlanId;
      const hasActiveOrTrialStatus = tenantSubscriptionStatus === 'active' || 
                                      tenantSubscriptionStatus === 'trialing' ||
                                      data.has_contracted_plan;

      return {
        isSubscribed: data.subscribed || false,
        isTrialing: data.is_trialing || false,
        trialStartDate: data.trial_start || null,
        trialEndDate: data.trial_end || null,
        totalTrialDays: data.total_trial_days || 14,
        daysUsed: data.days_used || 0,
        daysRemaining: data.days_remaining || 0,
        subscriptionStartDate: data.subscription_start || null,
        currentPeriodEnd: data.subscription_end || null,
        planId: data.product_id || null,
        status: data.status || 'none',
        // SINGLE SOURCE OF TRUTH: Use tenant's plan data directly
        tenantPlanId: tenantPlanId,
        tenantPlanName: tenantPlanName,
        // User has contracted a plan if tenant has a plan ID set
        hasContractedPlan: hasContractedPlanFromTenant,
        hasTrialBenefit: data.has_trial_benefit || false,
        trialBenefitMessage: data.trial_benefit_message || null,
        paymentInfo: paymentInfo,
      };
    },
    enabled: !!user && !!session,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 1000 * 60 * 5,
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
    staleTime: 1000 * 60 * 10,
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

    const daysRemaining = subscriptionStatus.daysRemaining;

    // Check if we're within the notification window
    const daysBeforeExpiration = notificationSettings?.days_before_expiration ?? 3;
    if (daysRemaining > daysBeforeExpiration) {
      return false;
    }

    // Check if notification was dismissed recently
    if (dismissalInfo?.dismissed_at) {
      const dismissedAt = new Date(dismissalInfo.dismissed_at);
      const now = new Date();
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

  // Get days remaining from the subscription status
  const getDaysRemaining = (): number => {
    return subscriptionStatus?.daysRemaining ?? 0;
  };

  // Get trial start display
  const getTrialStartDisplay = (): string => {
    if (!subscriptionStatus?.trialStartDate) return '';
    return new Date(subscriptionStatus.trialStartDate).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
    getTrialStartDisplay,
    refetchSubscription,
  };
}
