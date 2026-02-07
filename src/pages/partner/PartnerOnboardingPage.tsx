/**
 * PartnerOnboardingPage - Complete onboarding wizard for partners
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  CheckCircle2,
  Circle,
  Palette,
  CreditCard,
  Bell,
  Package,
  Globe,
  Shield,
  PlayCircle,
  Award,
  ArrowRight,
  AlertTriangle,
  Loader2,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { usePartnerOnboarding, usePartnerGuides, DryRunResult } from '@/hooks/usePartnerOnboarding';
import { cn } from '@/lib/utils';

interface StepConfig {
  key: string;
  title: string;
  description: string;
  icon: typeof CheckCircle2;
  required: boolean;
  configPath: string;
}

const STEPS: StepConfig[] = [
  {
    key: 'branding',
    title: 'Marca & White-label',
    description: 'Logo, nome comercial, cores e identidade visual',
    icon: Palette,
    required: true,
    configPath: '/partner/branding',
  },
  {
    key: 'payments',
    title: 'Pagamentos & Repasse',
    description: 'Conta Asaas, split de pagamentos e agenda de repasse',
    icon: CreditCard,
    required: true,
    configPath: '/partner/fees',
  },
  {
    key: 'plans',
    title: 'Planos & Preços',
    description: 'Configure pelo menos um plano ativo para vender',
    icon: Package,
    required: true,
    configPath: '/partner/plans',
  },
  {
    key: 'domains',
    title: 'Domínios',
    description: 'Domínio de marketing e app (opcional com domínio padrão)',
    icon: Globe,
    required: false,
    configPath: '/partner/domains',
  },
  {
    key: 'notifications',
    title: 'Notificações',
    description: 'Templates personalizados ou use os padrões da plataforma',
    icon: Bell,
    required: false,
    configPath: '/partner/notifications',
  },
  {
    key: 'compliance',
    title: 'Compliance',
    description: 'Dados do parceiro e consentimento LGPD',
    icon: Shield,
    required: true,
    configPath: '/partner/branding',
  },
];

function StepCard({ 
  step, 
  isCompleted, 
  details, 
  onConfigure 
}: { 
  step: StepConfig; 
  isCompleted: boolean; 
  details: Record<string, unknown>;
  onConfigure: () => void;
}) {
  const Icon = step.icon;
  
  return (
    <Card className={cn(
      'transition-all',
      isCompleted ? 'border-primary/50 bg-primary/5' : 'border-border'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {step.title}
                {step.required && !isCompleted && (
                  <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                )}
                {!step.required && (
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {step.description}
              </CardDescription>
            </div>
          </div>
          {isCompleted ? (
            <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground space-y-1">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                {typeof value === 'boolean' ? (
                  value ? (
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  )
                ) : null}
                <span className="capitalize">{key.replace(/_/g, ' ')}: {String(value)}</span>
              </div>
            ))}
          </div>
          <Button 
            variant={isCompleted ? 'outline' : 'default'} 
            size="sm"
            onClick={onConfigure}
          >
            {isCompleted ? 'Editar' : 'Configurar'}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DryRunResults({ result }: { result: DryRunResult }) {
  return (
    <Card className={cn(
      'border-2',
      result.certified ? 'border-primary bg-primary/5' : 'border-warning bg-warning/5'
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {result.certified ? (
            <>
              <Award className="h-5 w-5 text-primary" />
              Operação Certificada!
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-warning" />
              Ajustes Necessários
            </>
          )}
        </CardTitle>
        <CardDescription>
          {result.summary.passed} de {result.summary.total_tests} testes aprovados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {result.tests.map((test) => (
            <div 
              key={test.test}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                test.passed ? 'bg-primary/10' : 'bg-destructive/10'
              )}
            >
              <div className="flex items-center gap-2">
                {test.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <span className="font-medium">{test.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{test.details}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GuidesSection() {
  const { data: guides, isLoading } = usePartnerGuides();

  if (isLoading) return null;
  if (!guides || guides.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Material de Apoio
        </CardTitle>
        <CardDescription>
          Guias para operar sua revenda com sucesso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {guides.map((guide) => (
            <AccordionItem key={guide.key} value={guide.key}>
              <AccordionTrigger className="text-sm">
                {guide.title}
              </AccordionTrigger>
              <AccordionContent>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {guide.content_md}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default function PartnerOnboardingPage() {
  const navigate = useNavigate();
  const { 
    progress, 
    isLoading, 
    runDryRun, 
    isRunningDryRun, 
    dryRunResult 
  } = usePartnerOnboarding();
  const [showDryRun, setShowDryRun] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!progress) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Não foi possível carregar o progresso do onboarding.
        </AlertDescription>
      </Alert>
    );
  }

  const handleRunDryRun = () => {
    setShowDryRun(true);
    runDryRun();
  };

  const isCertified = progress.ready_to_sell && progress.dry_run_passed;

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Onboarding do Parceiro
          </h1>
          <p className="text-muted-foreground">
            Complete os passos abaixo para começar a vender
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {progress.completion_percentage}%
            </div>
            <div className="text-xs text-muted-foreground">Completo</div>
          </div>
          <Progress value={progress.completion_percentage} className="w-32" />
        </div>
      </div>

      {/* Certification Badge */}
      {isCertified && (
        <Alert className="border-primary bg-primary/10">
          <Award className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Parceiro Certificado!</AlertTitle>
          <AlertDescription>
            Sua operação está pronta para vendas. Você tem acesso total a split de pagamentos e repasses automáticos.
          </AlertDescription>
        </Alert>
      )}

      {/* Ready to Sell Status */}
      {progress.ready_to_sell && !progress.dry_run_passed && (
        <Alert>
          <PlayCircle className="h-4 w-4" />
          <AlertTitle>Quase lá!</AlertTitle>
          <AlertDescription>
            Todos os passos obrigatórios estão completos. Execute o teste de prontidão para certificar sua operação.
          </AlertDescription>
        </Alert>
      )}

      {/* Steps Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {STEPS.map((step) => {
          const stepData = progress.steps[step.key as keyof typeof progress.steps];
          const isCompleted = stepData?.completed || false;
          
          // Extract relevant details for display
          const details: Record<string, unknown> = {};
          if (step.key === 'branding') {
            details['Logo'] = (stepData as any)?.has_logo || false;
            details['Nome'] = (stepData as any)?.has_name || false;
          } else if (step.key === 'payments') {
            details['Asaas'] = (stepData as any)?.has_asaas || false;
            details['Split'] = (stepData as any)?.split_enabled || false;
          } else if (step.key === 'plans') {
            details['Planos ativos'] = (stepData as any)?.active_plans_count || 0;
          } else if (step.key === 'domains') {
            details['Marketing'] = (stepData as any)?.marketing_verified || false;
            details['App'] = (stepData as any)?.app_verified || false;
          } else if (step.key === 'notifications') {
            details['Usando padrão'] = (stepData as any)?.using_defaults || true;
          }

          return (
            <StepCard
              key={step.key}
              step={step}
              isCompleted={isCompleted}
              details={details}
              onConfigure={() => navigate(step.configPath)}
            />
          );
        })}
      </div>

      <Separator />

      {/* Dry Run Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Teste de Prontidão
          </CardTitle>
          <CardDescription>
            Simula toda a operação sem cobranças reais para validar sua configuração
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleRunDryRun}
            disabled={isRunningDryRun}
            size="lg"
            className="w-full md:w-auto"
          >
            {isRunningDryRun ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executando testes...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Testar Operação
              </>
            )}
          </Button>

          {showDryRun && dryRunResult && (
            <DryRunResults result={dryRunResult} />
          )}
        </CardContent>
      </Card>

      {/* Guides Section */}
      <GuidesSection />
    </div>
  );
}
