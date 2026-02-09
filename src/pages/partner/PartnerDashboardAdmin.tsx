/**
 * PartnerDashboardAdmin - Isolated admin dashboard for partner panel.
 * 
 * This component is EXCLUSIVELY for partner context and must NEVER
 * import any tenant/lojista components (Dashboard, AppLayout, AppSidebar, etc.).
 */

import { Link } from 'react-router-dom';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { usePartnerDashboardStats } from '@/hooks/usePartnerData';
import { usePartnerOnboarding } from '@/hooks/usePartnerOnboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Globe,
  Package,
  TrendingUp,
  Users,
  AlertTriangle,
  ClipboardCheck,
  CreditCard,
  ArrowRight,
  Rocket,
  Shield,
  CheckCircle2,
} from 'lucide-react';

/* ──────────────────── Types ──────────────────── */

interface AdminAction {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  variant?: 'default' | 'highlight';
}

/* ──────────────────── Component ──────────────────── */

export default function PartnerDashboardAdmin() {
  const { currentPartner, partnerBranding } = usePartnerContext();
  const { stats, isLoading } = usePartnerDashboardStats();
  const { progress, isLoading: onboardingLoading } = usePartnerOnboarding();

  const isReadyToSell =
    !onboardingLoading && progress?.completion_percentage === 100;

  /* ── Admin quick-action cards ── */
  const adminActions: AdminAction[] = [
    {
      title: 'Planos',
      description: `${stats?.plansCount ?? 0} ativos`,
      icon: Package,
      href: '/partner/plans',
    },
    {
      title: 'Lojistas / Tenants',
      description: `${stats?.totalTenants ?? 0} cadastrados`,
      icon: Building2,
      href: '/partner/tenants',
    },
    {
      title: 'Leads',
      description: 'Contatos e oportunidades',
      icon: Users,
      href: '/partner/leads',
    },
    {
      title: 'Pagamentos / Repasse',
      description: 'Recebimentos',
      icon: CreditCard,
      href: '/partner/payments',
    },
    {
      title: 'Domínios / SSL',
      description: `${stats?.activeDomainsCount ?? 0} verificados`,
      icon: Globe,
      href: '/partner/domains',
    },
    {
      title: 'Publicação',
      description: 'Página de vendas',
      icon: Rocket,
      href: '/partner/publication',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground">
            {partnerBranding?.platform_name || currentPartner?.name}
          </p>
        </div>

        {/* Ready-to-sell badge */}
        {isReadyToSell ? (
          <Badge variant="default" className="gap-1 text-sm px-3 py-1">
            <CheckCircle2 className="h-4 w-4" />
            Pronto para vender
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 text-sm px-3 py-1">
            <Shield className="h-4 w-4" />
            Configuração pendente
          </Badge>
        )}
      </div>

      {/* ── Onboarding banner (if not 100%) ── */}
      {progress && progress.completion_percentage < 100 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Configuração Inicial</CardTitle>
              </div>
              <Badge variant="secondary">{progress.completion_percentage}%</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progress.completion_percentage} className="h-2" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Complete o onboarding para começar a vender
              </p>
              <Button size="sm" asChild>
                <Link to="/partner/onboarding">
                  Continuar
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Stats Grid ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Lojistas"
          icon={Building2}
          isLoading={isLoading}
        >
          <div className="text-2xl font-bold">
            {stats?.totalTenants ?? 0}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              / {stats?.tenantLimit ?? 0}
            </span>
          </div>
          <Progress value={stats?.tenantLimitUsed ?? 0} className="h-1 mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.activeTenants ?? 0} ativos
          </p>
        </StatCard>

        <StatCard title="Domínios" icon={Globe} isLoading={isLoading}>
          <div className="text-2xl font-bold">{stats?.activeDomainsCount ?? 0}</div>
          <p className="text-xs text-muted-foreground">com SSL ativo</p>
        </StatCard>

        <StatCard title="Planos" icon={Package} isLoading={isLoading}>
          <div className="text-2xl font-bold">{stats?.plansCount ?? 0}</div>
          <p className="text-xs text-muted-foreground">configurados</p>
        </StatCard>

        <StatCard title="Revenue Share" icon={TrendingUp} isLoading={isLoading}>
          <div className="text-2xl font-bold">
            {currentPartner?.revenue_share_percent ?? 0}%
          </div>
          <p className="text-xs text-muted-foreground">sobre transações</p>
        </StatCard>
      </div>

      {/* ── Admin Actions ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Gestão Administrativa</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
          {adminActions.map((action) => (
            <Link key={action.href} to={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Tenant limit alert ── */}
      {stats && (stats.tenantLimitUsed ?? 0) >= 80 && (
        <Card className="border-warning">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle className="text-sm">Limite de Lojistas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Você está utilizando {stats.tenantLimitUsed}% do seu limite.
              {(stats.tenantLimitUsed ?? 0) >= 100
                ? ' Entre em contato para aumentar.'
                : ' Considere solicitar aumento em breve.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Partner Info ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informações do Parceiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <InfoRow label="Slug" value={<Badge variant="secondary">{currentPartner?.slug}</Badge>} />
          <InfoRow label="E-mail" value={currentPartner?.email} />
          <InfoRow
            label="Status"
            value={
              <Badge variant={currentPartner?.is_active ? 'default' : 'destructive'}>
                {currentPartner?.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            }
          />
          <InfoRow label="Limite por Organização" value={`${currentPartner?.max_users_per_tenant} usuários`} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ──────────────────── Sub-components ──────────────────── */

function StatCard({
  title,
  icon: Icon,
  isLoading,
  children,
}: {
  title: string;
  icon: React.ElementType;
  isLoading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-20" /> : children}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {typeof value === 'string' ? <span className="text-sm">{value}</span> : value}
    </div>
  );
}
