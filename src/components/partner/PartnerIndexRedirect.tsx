/**
 * PartnerIndexRedirect - Index route handler for /partner
 * 
 * Synchronously redirects based on onboarding status:
 * - Onboarding incomplete → /partner/onboarding
 * - Onboarding complete → /partner/dashboard
 * - Loading → neutral loader (no layout flash)
 */

import { Navigate } from 'react-router-dom';
import { usePartnerOnboarding } from '@/hooks/usePartnerOnboarding';
import { Loader2 } from 'lucide-react';

export default function PartnerIndexRedirect() {
  const { progress, isLoading } = usePartnerOnboarding();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!progress?.completed_at && (progress?.completion_percentage ?? 0) < 100) {
    return <Navigate to="/partner/onboarding" replace />;
  }

  return <Navigate to="/partner/dashboard" replace />;
}
