import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Settings2, 
  Package, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { ModuleStatusBadge, type ImplementationStatus } from './ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface ModuleConfigPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function ModuleConfigPanel({ module, onBack }: ModuleConfigPanelProps) {
  const addon = module?.addon_module;
  const status = (addon as any)?.implementation_status as ImplementationStatus || 'coming_soon';
  const isReady = ['ready', 'beta'].includes(status);

  if (!addon) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-warning mb-4" />
          <h3 className="text-lg font-semibold mb-2">Módulo não encontrado</h3>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{addon.name}</h1>
            <ModuleStatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground">{addon.description}</p>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Status do Módulo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Status da Licença</p>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-700 dark:text-green-400">
                  {module.source === 'plan_included' ? 'Incluso no Plano' : 'Ativo'}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Ativado em</p>
              <p className="font-semibold">
                {new Date(module.started_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Status */}
      {!isReady ? (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Clock className="h-5 w-5" />
              Em Desenvolvimento
            </CardTitle>
            <CardDescription>
              Este módulo está em fase de desenvolvimento e será liberado em breve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">
                O que esperar:
              </h4>
              <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-400">
                {(addon.features as string[] || []).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Package className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-amber-600 dark:text-amber-500">
                Você será notificado quando este módulo estiver disponível. 
                Sua licença já está ativa e você terá acesso assim que for liberado.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Funcionalidades
            </CardTitle>
            <CardDescription>
              Recursos disponíveis neste módulo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(addon.features as string[] || []).map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Module-specific configuration would go here based on slug */}
      {isReady && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurações
            </CardTitle>
            <CardDescription>
              Configure as opções do módulo {addon.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>As configurações específicas deste módulo serão exibidas aqui.</p>
              <p className="text-sm mt-2">
                Entre em contato com o suporte se precisar de ajuda.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
