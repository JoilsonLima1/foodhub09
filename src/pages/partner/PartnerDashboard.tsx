/**
 * PartnerDashboard - Main dashboard for partner panel
 * 
 * Shows stats, onboarding progress, and quick-action cards.
 * Redirects to /partner/onboarding if onboarding is not complete.
 */

import { Link } from 'react-router-dom';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { usePartnerDashboardStats } from '@/hooks/usePartnerData';
import { usePartnerOnboarding } from '@/hooks/usePartnerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Rocket,
  ArrowRight,
  Palette,
  Receipt,
  UserPlus,
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  variant?: 'default' | 'highlight';
}

export default function PartnerDashboard() {
  const { currentPartner, partnerBranding } = usePartnerContext();
  const { stats, isLoading } = usePartnerDashboardStats();
  const { progress, isLoading: onboardingLoading } = usePartnerOnboarding();

  const quickActions: QuickAction[] = [
    {
      title: 'Organizações',
      description: `${stats?.totalTenants || 0} cadastradas`,
      icon: Building2,
      href: '/partner/tenants',
    },
    {
      title: 'Nova Organização',
      description: 'Cadastrar cliente',
      icon: UserPlus,
      href: '/partner/tenants/create',
      variant: 'highlight',
    },
    {
      title: 'Planos',
      description: `${stats?.plansCount || 0} ativos`,
      icon: Package,
      href: '/partner/plans',
    },
    {
      title: 'Leads',
      description: 'Ver contatos',
      icon: Users,
      href: '/partner/leads',
    },
    {
      title: 'Faturas',
      description: 'Faturamento',
      icon: Receipt,
      href: '/partner/invoices',
    },
    {
      title: 'Pagamentos',
      description: 'Recebimentos',
      icon: CreditCard,
      href: '/partner/payments',
    },
    {
      title: 'Branding',
      description: 'Sua marca',
      icon: Palette,
      href: '/partner/branding',
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Painel do Parceiro
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo, {partnerBranding?.platform_name || currentPartner?.name}
        </p>
      </div>

      {/* Onboarding Banner (if not 100% complete) */}
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizações</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.totalTenants || 0}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {stats?.tenantLimit || 0}
                  </span>
                </div>
                <Progress value={stats?.tenantLimitUsed || 0} className="h-1 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.activeTenants || 0} ativas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Domínios</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.activeDomainsCount || 0}</div>
                <p className="text-xs text-muted-foreground">com SSL ativo</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.plansCount || 0}</div>
                <p className="text-xs text-muted-foreground">configurados</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Share</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {currentPartner?.revenue_share_percent || 0}%
                </div>
                <p className="text-xs text-muted-foreground">sobre transações</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Acesso Rápido</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} to={action.href}>
              <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${
                action.variant === 'highlight' ? 'border-primary/40 bg-primary/5' : ''
              }`}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    action.variant === 'highlight' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
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

      {/* Alerts */}
      {stats && stats.tenantLimitUsed >= 80 && (
        <Card className="border-warning">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle className="text-sm">Limite de Organizações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Você está utilizando {stats.tenantLimitUsed}% do seu limite.
              {stats.tenantLimitUsed >= 100
                ? ' Entre em contato para aumentar.'
                : ' Considere solicitar aumento em breve.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Partner Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informações do Parceiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Slug</span>
            <Badge variant="secondary">{currentPartner?.slug}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">E-mail</span>
            <span className="text-sm">{currentPartner?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={currentPartner?.is_active ? 'default' : 'destructive'}>
              {currentPartner?.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Limite por Organização</span>
            <span className="text-sm">{currentPartner?.max_users_per_tenant} usuários</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
