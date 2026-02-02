import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Settings as SettingsIcon,
  Store,
  CreditCard,
  Bell,
  Shield,
  Users,
  Palette,
  Plug2,
  Building2,
  HardDrive,
  Crown,
  Monitor,
  MessageSquarePlus,
  Package,
  User,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PAYMENT_PROVIDER_LABELS } from '@/lib/constants';
import { ThemeCustomizer } from '@/components/settings/ThemeCustomizer';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { IFoodIntegration } from '@/components/integrations/IFoodIntegration';
import { BusinessCategorySelector } from '@/components/settings/BusinessCategorySelector';
import { HardwareTutorial } from '@/components/settings/HardwareTutorial';
import { UserManagement } from '@/components/settings/UserManagement';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { POSSettings } from '@/components/settings/POSSettings';
import { SuggestionForm } from '@/components/suggestions/SuggestionForm';
import { StoreSettingsForm } from '@/components/settings/StoreSettingsForm';
import { ModulesSettings } from '@/components/settings/ModulesSettings';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { MyModulesHub } from '@/components/modules/MyModulesHub';
import { TenantFeesView } from '@/components/settings/TenantFeesView';

export default function Settings() {
  const { user, profile, roles } = useAuth();
  const isSuperAdmin = roles.includes('admin'); // In production, add proper super admin check

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="w-full h-auto flex flex-nowrap gap-2 overflow-x-auto justify-start md:flex-wrap md:overflow-visible">
          <TabsTrigger value="profile" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="subscription" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <Crown className="h-4 w-4" />
            Assinatura
          </TabsTrigger>
          <TabsTrigger value="my-modules" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <Package className="h-4 w-4" />
            Meus Módulos
          </TabsTrigger>
          <TabsTrigger value="modules" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <ShoppingCart className="h-4 w-4" />
            Loja de Módulos
          </TabsTrigger>
          <TabsTrigger value="category" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <Building2 className="h-4 w-4" />
            Categoria
          </TabsTrigger>
          <TabsTrigger value="store" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <Store className="h-4 w-4" />
            Loja
          </TabsTrigger>
          <TabsTrigger value="hardware" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <HardDrive className="h-4 w-4" />
            Hardware
          </TabsTrigger>
          <TabsTrigger value="pos" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <Monitor className="h-4 w-4" />
            PDV
          </TabsTrigger>
          <TabsTrigger value="appearance" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="payments" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <CreditCard className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="fees" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <DollarSign className="h-4 w-4" />
            Taxas
          </TabsTrigger>
          <TabsTrigger value="integrations" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <Plug2 className="h-4 w-4" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="notifications" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="users" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="security" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="feedback" className="shrink-0 flex items-center gap-2 whitespace-nowrap">
            <MessageSquarePlus className="h-4 w-4" />
            Sugestões
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        {/* Subscription Settings */}
        <TabsContent value="subscription">
          <SubscriptionSettings />
        </TabsContent>

        {/* My Modules Hub */}
        <TabsContent value="my-modules">
          <MyModulesHub />
        </TabsContent>

        {/* Modules Store */}
        <TabsContent value="modules">
          <ModulesSettings />
        </TabsContent>

        {/* Business Category */}
        <TabsContent value="category">
          <BusinessCategorySelector />
        </TabsContent>

        {/* Store Settings */}
        <TabsContent value="store">
          <StoreSettingsForm />
        </TabsContent>

        {/* Hardware Tutorial */}
        <TabsContent value="hardware">
          <HardwareTutorial />
        </TabsContent>

        {/* POS Settings */}
        <TabsContent value="pos">
          <POSSettings />
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <div className="space-y-6">
            <AppearanceSettings />
            <ThemeCustomizer isSuperAdmin={isSuperAdmin} />
          </div>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gateway Online</CardTitle>
                <CardDescription>
                  Configurações de pagamento online (Pix e Cartão)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Pagamentos Online</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar pagamentos via Pix e Cartão na loja online
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Pix</Label>
                    <p className="text-sm text-muted-foreground">
                      Aceitar pagamentos via Pix
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cartão de Crédito/Débito</Label>
                    <p className="text-sm text-muted-foreground">
                      Aceitar pagamentos via cartão online
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pagamentos Presenciais</CardTitle>
                <CardDescription>
                  Configurações de maquininhas e TEF
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provedor de Pagamento</Label>
                  <div className="grid gap-2 md:grid-cols-3">
                    {Object.entries(PAYMENT_PROVIDER_LABELS).map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:border-primary transition-colors"
                      >
                        <input
                          type="radio"
                          name="payment-provider"
                          id={`provider-${key}`}
                          className="h-4 w-4"
                        />
                        <Label htmlFor={`provider-${key}`} className="cursor-pointer">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Fallback Manual</Label>
                    <p className="text-sm text-muted-foreground">
                      Se a integração falhar, permitir entrada manual com antifraude
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button>Salvar Configurações</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fees View */}
        <TabsContent value="fees">
          <TenantFeesView />
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <IFoodIntegration />
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como você deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Novos Pedidos</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber alerta quando um novo pedido chegar
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Estoque Baixo</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertar quando um insumo estiver abaixo do mínimo
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Alertas de Fraude</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar sobre comprovantes suspeitos
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button>Salvar Preferências</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Settings */}
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Segurança e Antifraude</CardTitle>
              <CardDescription>
                Configurações de proteção contra fraudes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Validação de Comprovantes</Label>
                  <p className="text-sm text-muted-foreground">
                    Bloquear NSU/DOC duplicados nos últimos 90 dias
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Alerta de Autorização</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertar quando código de autorização + valor + cartão coincidirem
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Registro de Auditoria</Label>
                  <p className="text-sm text-muted-foreground">
                    Registrar todas as ações críticas no sistema
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button>Salvar Configurações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback / Suggestions */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5" />
                Enviar Sugestão
              </CardTitle>
              <CardDescription>
                Ajude-nos a melhorar o sistema! Envie sugestões de melhorias, relate problemas ou sugira novas funcionalidades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="text-center max-w-md">
                  <p className="text-muted-foreground mb-4">
                    Sua opinião é muito importante para nós. Clique no botão abaixo para enviar sua sugestão diretamente para nossa equipe.
                  </p>
                </div>
                <SuggestionForm
                  source="organization"
                  tenantId={profile?.tenant_id || undefined}
                  userId={user?.id}
                  userName={profile?.full_name}
                  userEmail={user?.email || ''} 
                  userPhone={profile?.phone || undefined}
                  triggerSize="lg"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
