import { ModuleGate } from '@/components/auth/ModuleGate';
import { MarketingCEOPanel } from '@/components/marketing/MarketingCEOPanel';
import { ModuleUpsellCard } from '@/components/modules/ModuleUpsellCard';

export default function Marketing() {
  return (
    <div className="container mx-auto p-6">
      <ModuleGate 
        moduleSlug="marketing_ceo"
        disabledFallback={
          <ModuleUpsellCard
            moduleSlug="marketing_ceo"
            moduleName="CEO de Marketing"
            moduleDescription="Gerencie o SEO e presença online do seu negócio com auditoria técnica automatizada, integração com buscadores e relatórios completos."
            modulePrice={49.90}
          />
        }
      >
        <MarketingCEOPanel />
      </ModuleGate>
    </div>
  );
}
