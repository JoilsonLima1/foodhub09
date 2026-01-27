import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, CreditCard, Save } from 'lucide-react';
import { usePaymentGateways, PaymentGateway } from '@/hooks/usePaymentGateways';

const gatewayProviders = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'pagseguro', label: 'PagSeguro' },
  { value: 'asaas', label: 'Asaas' },
  { value: 'pix', label: 'PIX Manual' },
  { value: 'stone', label: 'Stone' },
  { value: 'cielo', label: 'Cielo' },
];

export function PaymentGatewaysManager() {
  const { gateways, isLoading, createGateway, updateGateway, deleteGateway } = usePaymentGateways();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    api_key_masked: '',
    is_active: false,
    is_default: false,
  });

  const handleOpenDialog = (gateway?: PaymentGateway) => {
    if (gateway) {
      setEditingGateway(gateway);
      setFormData({
        name: gateway.name,
        provider: gateway.provider,
        api_key_masked: gateway.api_key_masked || '',
        is_active: gateway.is_active,
        is_default: gateway.is_default,
      });
    } else {
      setEditingGateway(null);
      setFormData({
        name: '',
        provider: '',
        api_key_masked: '',
        is_active: false,
        is_default: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingGateway) {
      updateGateway.mutate({ id: editingGateway.id, ...formData }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createGateway.mutate({ ...formData, config: {} }, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const toggleActive = (gateway: PaymentGateway) => {
    updateGateway.mutate({ id: gateway.id, is_active: !gateway.is_active });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gateways de Pagamento</h2>
          <p className="text-muted-foreground">
            Configure os provedores de pagamento disponíveis para os assinantes
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Gateway
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {gateways?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum gateway configurado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione gateways de pagamento para processar transações.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Gateway
              </Button>
            </CardContent>
          </Card>
        ) : (
          gateways?.map((gateway) => (
            <Card key={gateway.id} className={!gateway.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {gateway.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(gateway)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir gateway?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteGateway.mutate(gateway.id)}
                            className="bg-destructive"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardDescription>
                  {gatewayProviders.find(p => p.value === gateway.provider)?.label || gateway.provider}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  <Switch
                    checked={gateway.is_active}
                    onCheckedChange={() => toggleActive(gateway)}
                  />
                </div>
                {gateway.is_default && (
                  <Badge variant="secondary">Gateway Padrão</Badge>
                )}
                {gateway.api_key_masked && (
                  <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                    API Key: {gateway.api_key_masked}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGateway ? 'Editar Gateway' : 'Novo Gateway'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do provedor de pagamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Stripe Principal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provedor</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  {gatewayProviders.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key (mascarada)</Label>
              <Input
                id="api_key"
                value={formData.api_key_masked}
                onChange={(e) => setFormData({ ...formData, api_key_masked: e.target.value })}
                placeholder="sk_live_xxx..."
                type="password"
              />
              <p className="text-xs text-muted-foreground">
                A chave será armazenada de forma segura e exibida mascarada.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_default">Gateway Padrão</Label>
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
