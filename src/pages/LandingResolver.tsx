/**
 * LandingResolver - Resolves which landing page to show based on domain
 * 
 * Handles:
 * - Platform landing (default FoodHub09)
 * - Partner marketing landing (published partners)
 * - Partner preview landing (unpublished - with noindex)
 * - Suspended partner page
 */

import { usePublicPartner } from '@/contexts/PublicPartnerContext';
import Landing from '@/pages/Landing';
import PartnerLanding from '@/pages/PartnerLanding';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SuspendedPartnerPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Site Temporariamente Indisponível</h1>
          <p className="text-muted-foreground">
            Este site está temporariamente fora do ar para manutenção. 
            Por favor, tente novamente mais tarde.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar Novamente
        </Button>
      </div>
    </div>
  );
}

export default function LandingResolver() {
  const { 
    isPartnerDomain, 
    isMarketingDomain, 
    isSuspended,
    isLoading 
  } = usePublicPartner();

  // Show loading state while resolving domain
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Partner is suspended - show friendly unavailable page
  if (isPartnerDomain && isSuspended) {
    return <SuspendedPartnerPage />;
  }

  // If this is a partner's marketing domain, show their landing
  // (PartnerLanding handles published vs preview state internally)
  if (isPartnerDomain && isMarketingDomain) {
    return <PartnerLanding />;
  }

  // Otherwise show the default platform landing
  return <Landing />;
}
