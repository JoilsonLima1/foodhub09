/**
 * CreatePartnerTenant - Create a new tenant for the partner
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { usePartnerTenantsData, usePartnerPlansData } from '@/hooks/usePartnerData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CreatePartnerTenant() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentPartner } = usePartnerContext();
  const { stats, refetch } = usePartnerTenantsData();
  const { plans } = usePartnerPlansData();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    planId: '',
    notes: '',
  });

  const canCreate = (currentPartner?.max_tenants || 0) > stats.total;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreate) {
      toast({
        title: 'Limite atingido',
        description: 'Você atingiu o limite de organizações. Entre em contato para aumentar.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.tenantName || !formData.adminEmail || !formData.adminPassword) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create the user account (admin)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.adminPassword,
        options: {
          data: {
            full_name: formData.adminName || formData.tenantName,
            tenant_name: formData.tenantName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // Generate slug from tenant name
      const tenantSlug = formData.tenantName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // 2. Create the tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([{
          name: formData.tenantName,
          slug: tenantSlug + '-' + Date.now().toString(36),
          email: formData.tenantEmail || formData.adminEmail,
          phone: formData.tenantPhone || null,
          is_active: true,
          subscription_status: 'active',
        }])
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 3. Create partner_tenants link
      const { error: linkError } = await supabase
        .from('partner_tenants')
        .insert({
          partner_id: currentPartner!.id,
          tenant_id: tenantData.id,
          partner_plan_id: formData.planId || null,
          status: 'active',
          billing_notes: formData.notes || null,
        });

      if (linkError) throw linkError;

      // 4. Update profile with tenant_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ tenant_id: tenantData.id })
        .eq('user_id', authData.user.id);

      if (profileError) {
        console.warn('Profile update warning:', profileError);
      }

      // 5. Create admin role for the user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          tenant_id: tenantData.id,
          role: 'admin',
        });

      if (roleError) {
        console.warn('Role creation warning:', roleError);
      }

      toast({
        title: 'Organização criada!',
        description: `${formData.tenantName} foi criada com sucesso.`,
      });

      refetch();
      navigate('/partner/tenants');

    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast({
        title: 'Erro ao criar organização',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/partner/tenants')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Organização</h1>
          <p className="text-muted-foreground">
            Crie uma nova organização vinculada ao seu parceiro
          </p>
        </div>
      </div>

      {!canCreate && (
        <Alert variant="destructive">
          <AlertDescription>
            Você atingiu o limite de {currentPartner?.max_tenants} organizações.
            Entre em contato para solicitar aumento do limite.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Dados da Organização */}
          <Card>
            <CardHeader>
              <CardTitle>Dados da Organização</CardTitle>
              <CardDescription>Informações básicas da nova organização</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Nome da Organização *</Label>
                <Input
                  id="tenantName"
                  value={formData.tenantName}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenantName: e.target.value }))}
                  placeholder="Ex: Restaurante Bom Sabor"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tenantEmail">E-mail da Organização</Label>
                  <Input
                    id="tenantEmail"
                    type="email"
                    value={formData.tenantEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, tenantEmail: e.target.value }))}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantPhone">Telefone</Label>
                  <Input
                    id="tenantPhone"
                    value={formData.tenantPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, tenantPhone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {plans.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="planId">Plano</Label>
                  <Select
                    value={formData.planId}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, planId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - R$ {plan.monthly_price.toFixed(2)}/mês
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados do Administrador */}
          <Card>
            <CardHeader>
              <CardTitle>Administrador da Organização</CardTitle>
              <CardDescription>
                Usuário que terá acesso administrativo à nova organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminName">Nome Completo</Label>
                <Input
                  id="adminName"
                  value={formData.adminName}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                  placeholder="Nome do administrador"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">E-mail de Acesso *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                  placeholder="admin@empresa.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">Senha *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas internas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações sobre esta organização (visível apenas para você)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/partner/tenants')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !canCreate}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Organização
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
