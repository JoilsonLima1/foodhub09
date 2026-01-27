import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PAYMENT_PROVIDER_LABELS } from '@/lib/constants';
import { ThemeCustomizer } from '@/components/settings/ThemeCustomizer';
import { IFoodIntegration } from '@/components/integrations/IFoodIntegration';

export default function Settings() {
  const { profile, roles } = useAuth();
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

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
          <TabsTrigger value="store">
            <Store className="h-4 w-4 mr-2" />
            Loja
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug2 className="h-4 w-4 mr-2" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Loja</CardTitle>
              <CardDescription>
                Dados básicos do seu estabelecimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="store-name">Nome do Estabelecimento</Label>
                  <Input id="store-name" placeholder="Nome da sua loja" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-phone">Telefone</Label>
                  <Input id="store-phone" placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-email">Email</Label>
                  <Input id="store-email" type="email" placeholder="contato@loja.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-whatsapp">WhatsApp</Label>
                  <Input id="store-whatsapp" placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-address">Endereço</Label>
                <Input id="store-address" placeholder="Rua, número, bairro" />
              </div>
              <Button>Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <ThemeCustomizer isSuperAdmin={isSuperAdmin} />
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
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>
                Adicione e gerencie usuários e permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Em Desenvolvimento</h3>
                <p className="text-muted-foreground mb-4">
                  O gerenciamento completo de usuários estará disponível em breve.
                </p>
                <div className="flex justify-center gap-2">
                  <Badge>Admin</Badge>
                  <Badge variant="secondary">Gerente</Badge>
                  <Badge variant="secondary">Caixa</Badge>
                  <Badge variant="secondary">Cozinha</Badge>
                  <Badge variant="secondary">Estoque</Badge>
                  <Badge variant="secondary">Entregador</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
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
      </Tabs>
    </div>
  );
}
