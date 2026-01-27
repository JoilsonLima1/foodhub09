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
}

/**
 * Hook to check if user has access to features based on trial/subscription status.
 * 
 * During trial period: ALL features are unlocked
 * After trial expires: Features are locked, data is preserved
 * With active subscription: Features based on plan
 */
export function useFeatureAccess(feature?: FeatureKey): FeatureAccessResult {
  const { subscriptionStatus, getDaysRemaining } = useTrialStatus();
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
    };
  }

  // User has active paid subscription
  if (subscriptionStatus?.isSubscribed && !subscriptionStatus?.isTrialing) {
    return {
      hasAccess: true,
      isTrialActive: false,
      isTrialExpired: false,
      daysRemaining: 0,
      trialDays,
      reason: 'subscribed',
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
