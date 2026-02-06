/**
 * ModuleUpsellCard Component
 * 
 * Shows an attractive upsell card when a user tries to access
 * a module they haven't purchased/activated.
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  CheckCircle2, 
  ShoppingCart,
  Sparkles,
  BarChart3,
  Globe,
  FileCode,
  Search,
} from 'lucide-react';
import type { AddonModule } from '@/hooks/useAddonModules';

interface ModuleUpsellCardProps {
  moduleSlug: string;
  moduleName?: string;
  moduleDescription?: string;
  modulePrice?: number;
  features?: string[];
  onActivate?: () => void;
}

// Default features for known modules
const MODULE_FEATURES: Record<string, string[]> = {
  marketing_ceo: [
    'Auditoria técnica de SEO automatizada',
    'Geração de sitemap.xml e robots.txt',
    'Integração com Google Search Console',
    'Relatórios de indexação e autoridade',
    'Monitoramento de score SEO',
    'Histórico de auditorias mensais',
  ],
};

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  marketing_ceo: TrendingUp,
};

export function ModuleUpsellCard({
  moduleSlug,
  moduleName = 'Módulo Premium',
  moduleDescription = 'Este módulo oferece funcionalidades avançadas para seu negócio.',
  modulePrice = 49.90,
  features = [],
  onActivate,
}: ModuleUpsellCardProps) {
  const Icon = MODULE_ICONS[moduleSlug] || Sparkles;
  const displayFeatures = features.length > 0 ? features : MODULE_FEATURES[moduleSlug] || [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full border-2 border-primary/20 shadow-xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
            <Icon className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Módulo Premium
            </Badge>
            <CardTitle className="text-2xl">{moduleName}</CardTitle>
            <CardDescription className="text-base max-w-md mx-auto">
              {moduleDescription}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Price */}
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-primary">
                {formatPrice(modulePrice)}
              </span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Cancele quando quiser • Sem taxa de adesão
            </p>
          </div>

          {/* Features */}
          {displayFeatures.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-center">O que está incluído:</h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {displayFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link to={`/settings?tab=modules&module=${moduleSlug}`} className="flex-1">
              <Button className="w-full" size="lg" onClick={onActivate}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ver na Loja de Módulos
              </Button>
            </Link>
            <Link to="/settings?tab=subscription" className="flex-1">
              <Button variant="outline" className="w-full" size="lg">
                Ver Planos
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Pagamento seguro
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Ativação imediata
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Suporte incluso
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
