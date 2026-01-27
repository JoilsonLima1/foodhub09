import { useTrialStatus } from './useTrialStatus';
import { usePublicSettings } from './usePublicSettings';
import { useAuth } from '@/contexts/AuthContext';

export type FeatureKey = 
  | 'pos'
  | 'kitchen'
  | 'deliveries'
  | 'stock'
  | 'reports'
  | 'products'
  | 'tables'
  | 'orders'
  | 'cmv'
  | 'ai_forecast'
  | 'courier_dashboard'
  | 'settings';

export interface FeatureAccessResult {
  hasAccess: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysRemaining: number;
  trialDays: number;
  reason: 'trial_active' | 'subscribed' | 'trial_expired' | 'no_subscription';
  isLoading: boolean;
}

/**
 * Hook to check if user has access to features based on trial/subscription status.
 * 
 * During trial period: ALL features are unlocked
 * After trial expires: Features are locked, data is preserved
 * With active subscription: Features based on plan
 */
export function useFeatureAccess(feature?: FeatureKey): FeatureAccessResult {
  const { subscriptionStatus, getDaysRemaining, isLoading } = useTrialStatus();
  const { trialPeriod } = usePublicSettings();
  const { user } = useAuth();

  const trialDays = trialPeriod?.days ?? 14;
  const daysRemaining = getDaysRemaining();

  // Not logged in
  if (!user) {
    return {
      hasAccess: false,
      isTrialActive: false,
      isTrialExpired: false,
      daysRemaining: 0,
      trialDays,
      reason: 'no_subscription',
      isLoading,
    };
  }

  // Still loading subscription status - grant access while loading
  if (isLoading) {
    return {
      hasAccess: true,
      isTrialActive: false,
      isTrialExpired: false,
      daysRemaining: trialDays,
      trialDays,
      reason: 'trial_active',
      isLoading: true,
    };
  }

  // If subscription check failed or returned null, grant temporary access
  if (!subscriptionStatus) {
    return {
      hasAccess: true,
      isTrialActive: true,
      isTrialExpired: false,
      daysRemaining: trialDays,
      trialDays,
      reason: 'trial_active',
      isLoading: false,
    };
  }

  // User has active paid subscription (not trialing)
  if (subscriptionStatus?.isSubscribed && !subscriptionStatus?.isTrialing) {
    return {
      hasAccess: true,
      isTrialActive: false,
      isTrialExpired: false,
      daysRemaining: 0,
      trialDays,
      reason: 'subscribed',
      isLoading: false,
    };
  }

  // User is in trial period
  if (subscriptionStatus?.isTrialing && daysRemaining > 0) {
    return {
      hasAccess: true,
      isTrialActive: true,
      isTrialExpired: false,
      daysRemaining,
      trialDays,
      reason: 'trial_active',
      isLoading: false,
    };
  }

  // Trial expired or no subscription
  const isTrialExpired = subscriptionStatus?.trialEndDate 
    ? new Date(subscriptionStatus.trialEndDate) < new Date()
    : false;

  return {
    hasAccess: false,
    isTrialActive: false,
    isTrialExpired,
    daysRemaining: 0,
    trialDays,
    reason: isTrialExpired ? 'trial_expired' : 'no_subscription',
    isLoading: false,
  };
}

/**
 * Hook to check multiple features at once
 */
export function useMultipleFeatureAccess(features: FeatureKey[]): Record<FeatureKey, boolean> {
  const access = useFeatureAccess();
  
  return features.reduce((acc, feature) => {
    acc[feature] = access.hasAccess;
    return acc;
  }, {} as Record<FeatureKey, boolean>);
}
