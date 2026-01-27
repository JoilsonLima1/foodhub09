import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Crown,
  CreditCard,
  Building2,
  Users,
  BarChart3,
  AlertTriangle,
  Package,
  Palette,
  Settings2,
} from 'lucide-react';
import { PlanEditor } from '@/components/superadmin/PlanEditor';
import { FeatureComparison } from '@/components/superadmin/FeatureComparison';
import { SubscribersManager } from '@/components/superadmin/SubscribersManager';
import { PaymentGatewaysManager } from '@/components/superadmin/PaymentGatewaysManager';
import { BrandingSettings } from '@/components/superadmin/BrandingSettings';
import { useSubscribers } from '@/hooks/useSubscribers';

export default function SuperAdmin() {
  const { roles } = useAuth();
  const { stats } = useSubscribers();
  
  // SECURITY NOTE: This is a UI-level check for user experience.
  // All actual permissions are enforced server-side via RLS policies.
  // Database operations for subscription_plans, payment_gateways, 
  // system_settings, and branding storage all require super_admin role.
  const isSuperAdmin = roles.includes('super_admin');

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar esta página. 
            Apenas usuários com privilégios de Super Admin podem visualizar este conteúdo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            Painel Super Admin
          </h1>
          <p className="text-muted-foreground">
            Gestão global de planos, preços e funcionalidades do SaaS
          </p>
        </div>
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Super Admin
        </Badge>
      </div>

      {/* Alert for demo mode */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Modo Demonstração</AlertTitle>
        <AlertDescription>
          Você está visualizando o painel de Super Admin. Em produção, apenas usuários 
          com role `super_admin` terão acesso a esta área.
        </AlertDescription>
      </Alert>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Starter, Professional, Enterprise</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assinantes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} ativos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">De assinaturas ativas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Teste</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialing}</div>
            <p className="text-xs text-muted-foreground">Período gratuito</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="subscribers" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="subscribers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assinantes
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="gateways" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Comparativo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers">
          <SubscribersManager />
        </TabsContent>

        <TabsContent value="plans">
          <PlanEditor />
        </TabsContent>

        <TabsContent value="gateways">
          <PaymentGatewaysManager />
        </TabsContent>

        <TabsContent value="branding">
          <BrandingSettings />
        </TabsContent>

        <TabsContent value="comparison">
          <FeatureComparison />
        </TabsContent>
      </Tabs>
    </div>
  );
}
