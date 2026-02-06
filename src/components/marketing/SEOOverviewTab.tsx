import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRight,
  Globe,
  FileCode,
  Search,
  Sparkles
} from 'lucide-react';
import { useMarketingSEO, MarketingSEOSettings } from '@/hooks/useMarketingSEO';
import { OrganizationDomain } from '@/hooks/useOrganizationDomains';

interface SEOOverviewTabProps {
  domain: OrganizationDomain | undefined;
  settings: MarketingSEOSettings | null | undefined;
  hasVerifiedDomain: boolean;
}

export function SEOOverviewTab({ domain, settings, hasVerifiedDomain }: SEOOverviewTabProps) {
  const { runAudit } = useMarketingSEO();

  const checklistItems = [
    {
      id: 'domain',
      label: 'Domínio verificado',
      description: 'Configure e verifique seu domínio personalizado',
      completed: hasVerifiedDomain,
      icon: Globe,
    },
    {
      id: 'sitemap',
      label: 'Sitemap configurado',
      description: 'Gere o sitemap.xml para os buscadores',
      completed: settings?.sitemap_enabled ?? false,
      icon: FileCode,
    },
    {
      id: 'meta',
      label: 'Meta tags configuradas',
      description: 'Defina título e descrição padrão',
      completed: !!(settings?.default_description),
      icon: FileCode,
    },
    {
      id: 'google',
      label: 'Google Search Console',
      description: 'Cadastre seu site no Google',
      completed: settings?.google_search_console_verified ?? false,
      icon: Search,
    },
    {
      id: 'bing',
      label: 'Bing Webmaster Tools',
      description: 'Cadastre seu site no Bing',
      completed: settings?.bing_webmaster_verified ?? false,
      icon: Search,
    },
  ];

  const completedCount = checklistItems.filter(item => item.completed).length;
  const progress = (completedCount / checklistItems.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Progresso do SEO
          </CardTitle>
          <CardDescription>
            Complete os passos abaixo para otimizar sua presença online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>{completedCount} de {checklistItems.length} passos concluídos</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          
          {progress === 100 && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Parabéns! Seu SEO básico está completo.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Checklist de SEO</CardTitle>
          <CardDescription>
            Siga estes passos para configurar o SEO do seu site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checklistItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  item.completed 
                    ? 'bg-primary/5 border-primary/20' 
                    : 'bg-muted/50 border-border'
                }`}
              >
                <div className={`p-2 rounded-full ${item.completed ? 'bg-primary/10' : 'bg-muted'}`}>
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{item.label}</h4>
                    {item.completed && (
                      <Badge variant="secondary" className="text-xs">Concluído</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
                {!item.completed && (
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {hasVerifiedDomain && (
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button 
              onClick={() => runAudit.mutate()}
              disabled={runAudit.isPending}
            >
              {runAudit.isPending ? 'Analisando...' : 'Executar Auditoria SEO'}
            </Button>
            <Button variant="outline">
              Ver Relatório Completo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tips for beginners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 Dicas para Iniciantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>O que é SEO?</strong> SEO (Search Engine Optimization) são técnicas para 
            fazer seu site aparecer melhor nos resultados do Google e outros buscadores.
          </p>
          <p>
            <strong>Por que é importante?</strong> Quanto melhor seu SEO, mais pessoas 
            encontram seu negócio quando pesquisam online.
          </p>
          <p>
            <strong>Preciso de conhecimento técnico?</strong> Não! Este painel foi criado 
            para guiar você passo a passo, mesmo sem experiência.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
