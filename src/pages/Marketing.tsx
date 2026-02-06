import { ModuleGate } from '@/components/auth/ModuleGate';
import { MarketingCEOPanel } from '@/components/marketing/MarketingCEOPanel';

export default function Marketing() {
  return (
    <div className="container mx-auto p-6">
      <ModuleGate moduleSlug="marketing_ceo">
        <MarketingCEOPanel />
      </ModuleGate>
    </div>
  );
}
