/**
 * LandingResolver - Resolves which landing page to show based on domain
 * 
 * If current domain is a verified partner marketing domain, shows PartnerLanding.
 * Otherwise, shows the default FoodHub09 Landing.
 */

import { usePublicPartner } from '@/contexts/PublicPartnerContext';
import Landing from '@/pages/Landing';
import PartnerLanding from '@/pages/PartnerLanding';
import { Loader2 } from 'lucide-react';

export default function LandingResolver() {
  const { isPartnerDomain, isMarketingDomain, isLoading } = usePublicPartner();

  // Show loading state while resolving domain
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If this is a partner's marketing domain, show their landing
  if (isPartnerDomain && isMarketingDomain) {
    return <PartnerLanding />;
  }

  // Otherwise show the default platform landing
  return <Landing />;
}

