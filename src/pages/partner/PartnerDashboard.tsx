/**
 * PartnerDashboard - Main dashboard for partner panel
 */

import { usePartnerContext } from '@/contexts/PartnerContext';
import { usePartnerDashboardStats } from '@/hooks/usePartnerData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Building2, Globe, Package, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PartnerDashboard() {
  const { currentPartner, partnerBranding } = usePartnerContext();
  const { stats, isLoading } = usePartnerDashboardStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo ao painel do parceiro {partnerBranding?.platform_name || currentPartner?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Organizações */}
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
                <Progress 
                  value={stats?.tenantLimitUsed || 0} 
                  className="h-1 mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.activeTenants || 0} ativas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Domínios Verificados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Domínios Verificados</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.activeDomainsCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  com SSL ativo
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Planos Ativos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.plansCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  planos configurados
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Revenue Share */}
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
                <p className="text-xs text-muted-foreground">
                  sobre transações
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Limite de Organizações */}
        {stats && stats.tenantLimitUsed >= 80 && (
          <Card className="border-warning">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle className="text-sm">Limite de Organizações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Você está utilizando {stats.tenantLimitUsed}% do seu limite de organizações.
                {stats.tenantLimitUsed >= 100 
                  ? ' Entre em contato para aumentar seu limite.'
                  : ' Considere solicitar aumento do limite em breve.'}
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
    </div>
  );
}
