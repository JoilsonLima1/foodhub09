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
} from 'lucide-react';
import { PlanEditor } from '@/components/superadmin/PlanEditor';
import { FeatureComparison } from '@/components/superadmin/FeatureComparison';
import { Navigate } from 'react-router-dom';

export default function SuperAdmin() {
  const { roles } = useAuth();
  
  // Check for super_admin role - for demo, also allow admin
  const isSuperAdmin = roles.includes('super_admin') || roles.includes('admin');

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
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
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Pizzaria Demo ativa</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0</div>
            <p className="text-xs text-muted-foreground">Demo não cobra</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Across all tenants</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="plans">
            <Package className="h-4 w-4 mr-2" />
            Gestão de Planos
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <BarChart3 className="h-4 w-4 mr-2" />
            Comparativo
          </TabsTrigger>
          <TabsTrigger value="tenants">
            <Building2 className="h-4 w-4 mr-2" />
            Tenants
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <PlanEditor />
        </TabsContent>

        <TabsContent value="comparison">
          <FeatureComparison />
        </TabsContent>

        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Tenants</CardTitle>
              <CardDescription>
                Visualize e gerencie todos os tenants do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Em Desenvolvimento</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  O painel completo de gestão de tenants estará disponível em breve, 
                  incluindo upgrade/downgrade de planos, métricas de uso e gestão de assinaturas.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
