import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2,
  Package,
  Building2,
  CreditCard,
  CheckCircle,
} from 'lucide-react';

interface ActivateModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivateModuleDialog({ open, onOpenChange }: ActivateModuleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [pricePaid, setPricePaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [asaasPaymentId, setAsaasPaymentId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Fetch tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['all-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, subscription_status')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch modules
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['all-addon-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addon_modules')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation to activate module
  const activateModule = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('activate-module-manual', {
        body: {
          tenantId: selectedTenantId,
          moduleId: selectedModuleId,
          pricePaid,
          paymentMethod,
          paymentProvider: 'asaas',
          asaasPaymentId: asaasPaymentId || undefined,
          notes: notes || undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Módulo ativado com sucesso!',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['tenant-addon-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-modules-detailed'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao ativar módulo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSelectedTenantId('');
    setSelectedModuleId('');
    setPricePaid(0);
    setPaymentMethod('pix');
    setAsaasPaymentId('');
    setNotes('');
  };

  const selectedModule = modules?.find(m => m.id === selectedModuleId);

  const handleModuleChange = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    const mod = modules?.find(m => m.id === moduleId);
    if (mod) setPricePaid(mod.monthly_price);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const isLoading = tenantsLoading || modulesLoading;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Ativar Módulo (Pagamento Confirmado)
          </DialogTitle>
          <DialogDescription>
            Use esta opção para ativar módulos cujo pagamento já foi confirmado no Asaas mas o webhook não processou.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Tenant (Organização)</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants?.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{tenant.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Módulo</Label>
                <Select value={selectedModuleId} onValueChange={handleModuleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules?.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>{module.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {formatPrice(module.monthly_price)}/mês
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedModule && (
                <div className="space-y-2">
                  <Label>Valor Pago (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricePaid}
                    onChange={(e) => setPricePaid(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Preço padrão: {formatPrice(selectedModule.monthly_price)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ID do Pagamento Asaas (opcional)</Label>
                <Input
                  placeholder="pay_xxxxxxxxxxxxxxxx"
                  value={asaasPaymentId}
                  onChange={(e) => setAsaasPaymentId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Encontre no painel do Asaas para rastreabilidade
                </p>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Pagamento confirmado em 29/01, webhook não processou..."
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => activateModule.mutate()}
            disabled={!selectedTenantId || !selectedModuleId || activateModule.isPending}
          >
            {activateModule.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            <CheckCircle className="h-4 w-4 mr-2" />
            Ativar Módulo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
