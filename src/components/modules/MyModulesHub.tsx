import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Settings2,
  ExternalLink,
  Gift,
  Wallet,
  AlertCircle,
  ChevronRight,
  Truck,
  Plug2,
  Megaphone,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useTenantModules, type TenantModuleDetailed } from '@/hooks/useTenantModules';
import { ModuleStatusBadge, type ImplementationStatus } from './ModuleStatusBadge';
import { SmartDeliveryPanel } from './SmartDeliveryPanel';
import { ModuleConfigPanel } from './ModuleConfigPanel';
import { cn } from '@/lib/utils';

// Icon mapping for module categories
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  integrations: Plug2,
  operations: Settings2,
  marketing: Megaphone,
  hardware: HardDrive,
  logistics: Truck,
};

const getModuleIcon = (iconName: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Package,
    Plug2,
    Settings2,
    Megaphone,
    HardDrive,
    Truck,
  };
  return icons[iconName] || Package;
};

interface ModuleWithStatus extends TenantModuleDetailed {
  addon_module?: TenantModuleDetailed['addon_module'] & {
    implementation_status?: ImplementationStatus;
  };
}

export function MyModulesHub() {
  const { tenantModules, isLoading, getModulesBreakdown, refetch } = useTenantModules();
  const [selectedModuleSlug, setSelectedModuleSlug] = useState<string | null>(null);

  const breakdown = getModulesBreakdown();
  const activeModules = [
    ...breakdown.includedModules,
    ...breakdown.purchasedModules,
  ] as ModuleWithStatus[];

  const handleOpenModule = (slug: string) => {
    setSelectedModuleSlug(slug);
  };

  const handleClosePanel = () => {
    setSelectedModuleSlug(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  // Show module configuration panel if one is selected
  if (selectedModuleSlug) {
    const selectedModule = activeModules.find(
      (m) => m.addon_module?.slug === selectedModuleSlug
    );

    if (selectedModuleSlug === 'smart_delivery') {
      return (
        <SmartDeliveryPanel
          module={selectedModule}
          onBack={handleClosePanel}
        />
      );
    }

    return (
      <ModuleConfigPanel
        module={selectedModule}
        onBack={handleClosePanel}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>Meus Módulos</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
          <CardDescription>
            Gerencie e configure os módulos ativos na sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {activeModules.filter((m) => (m.addon_module as any)?.implementation_status === 'ready').length}
              </p>
              <p className="text-sm text-green-600 dark:text-green-500">Prontos para Usar</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
              <Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {activeModules.filter((m) => (m.addon_module as any)?.implementation_status === 'beta').length}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-500">Em Beta</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-amber-600 mb-2" />
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {activeModules.filter((m) => 
                  ['coming_soon', 'development'].includes((m.addon_module as any)?.implementation_status || 'coming_soon')
                ).length}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-500">Em Desenvolvimento</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeModules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum módulo ativo</h3>
            <p className="text-muted-foreground mb-4">
              Você ainda não possui módulos adicionais. Visite a aba "Módulos" para ver os disponíveis.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Included Modules */}
          {breakdown.includedModules.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gift className="h-4 w-4 text-green-600" />
                <span>Incluídos no Plano ({breakdown.includedModules.length})</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {breakdown.includedModules.map((mod) => (
                  <ModuleCard
                    key={mod.id}
                    module={mod as ModuleWithStatus}
                    source="included"
                    onOpen={handleOpenModule}
                  />
                ))}
              </div>
              <Separator />
            </>
          )}

          {/* Purchased Modules */}
          {breakdown.purchasedModules.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                <span>Módulos Adquiridos ({breakdown.purchasedModules.length})</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {breakdown.purchasedModules.map((mod) => (
                  <ModuleCard
                    key={mod.id}
                    module={mod as ModuleWithStatus}
                    source="purchased"
                    onOpen={handleOpenModule}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface ModuleCardProps {
  module: ModuleWithStatus;
  source: 'included' | 'purchased';
  onOpen: (slug: string) => void;
}

function ModuleCard({ module, source, onOpen }: ModuleCardProps) {
  const addon = module.addon_module;
  if (!addon) return null;

  const Icon = CATEGORY_ICONS[addon.category] || Package;
  const status = (addon as any).implementation_status as ImplementationStatus || 'coming_soon';
  const isReady = ['ready', 'beta'].includes(status);

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      source === 'included' && 'border-green-500/30',
      source === 'purchased' && 'border-primary/30',
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
              source === 'included' ? 'bg-green-100 dark:bg-green-900/50' : 'bg-primary/10'
            )}>
              <Icon className={cn(
                'h-5 w-5',
                source === 'included' ? 'text-green-600' : 'text-primary'
              )} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{addon.name}</h3>
                <ModuleStatusBadge status={status} />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {addon.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {source === 'included' ? (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <Gift className="h-3 w-3 mr-1" />
                    Incluso no Plano
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Wallet className="h-3 w-3 mr-1" />
                    Contratado
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          {isReady ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpen(addon.slug)}
              className="w-full"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Configurar Módulo
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          ) : (
            <div className="w-full text-center py-2">
              <p className="text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Em desenvolvimento - disponível em breve
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
