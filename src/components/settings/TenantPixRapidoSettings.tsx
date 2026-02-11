import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Zap, CheckCircle, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WooviCredentialsPanel } from '@/components/superadmin/pix/WooviCredentialsPanel';
import { LegalAcceptanceModal } from '@/components/legal/LegalAcceptanceModal';
import { useLegalAcceptance } from '@/hooks/useLegalAcceptance';
import { toast } from '@/hooks/use-toast';

export function TenantPixRapidoSettings() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const { allAccepted, canActivateSplit, loading: legalLoading, refresh: refreshLegal } = useLegalAcceptance(tenantId || null);

  // Get the Woovi PSP provider ID
  const { data: wooviProvider } = useQuery({
    queryKey: ['woovi-provider'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pix_psp_providers')
        .select('id, name, display_name, is_active')
        .eq('name', 'woovi')
        .single();
      return data;
    },
  });

  // Check if tenant has own credentials
  const { data: tenantAccount } = useQuery({
    queryKey: ['tenant-psp-account', tenantId, wooviProvider?.id],
    enabled: !!tenantId && !!wooviProvider?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('tenant_psp_accounts')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('psp_provider_id', wooviProvider!.id)
        .maybeSingle();
      return data;
    },
  });

  const usePlatform = tenantAccount?.use_platform_credentials !== false;

  const toggleCredentialSource = useMutation({
    mutationFn: async (usePlatformCreds: boolean) => {
      if (tenantAccount?.id) {
        const { error } = await supabase
          .from('tenant_psp_accounts')
          .update({ use_platform_credentials: usePlatformCreds })
          .eq('id', tenantAccount.id);
        if (error) throw error;
      } else if (!usePlatformCreds && tenantId && wooviProvider?.id) {
        // Create account entry to store own credentials
        const { error } = await supabase
          .from('tenant_psp_accounts')
          .insert({
            tenant_id: tenantId,
            psp_provider_id: wooviProvider.id,
            is_enabled: true,
            use_platform_credentials: false,
            kyc_status: 'not_required',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-psp-account'] });
      toast({ title: 'Preferência salva' });
    },
  });

  if (!wooviProvider?.is_active) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>PIX Rápido não está disponível neste momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            PIX Rápido (Woovi)
          </CardTitle>
          <CardDescription>
            PIX sem CPF com QR Code dinâmico e confirmação automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Usar credencial da plataforma</Label>
              <p className="text-xs text-muted-foreground">
                {usePlatform
                  ? 'As cobranças PIX usam a conta da plataforma'
                  : 'Você está usando suas próprias credenciais Woovi'}
              </p>
            </div>
            <Switch
              checked={usePlatform}
              onCheckedChange={(v) => toggleCredentialSource.mutate(v)}
            />
          </div>

          {usePlatform && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              <CheckCircle className="h-4 w-4 text-primary" />
              Nenhuma configuração necessária. As cobranças passam pela conta da plataforma.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legal acceptance status */}
      <Card>
        <CardContent className="py-4">
          {allAccepted ? (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Shield className="h-4 w-4" />
              Termos jurídicos aceitos — Split automático habilitado.
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                É necessário aceitar os termos jurídicos atualizados para ativar o Split Automático.
              </div>
              <Button size="sm" onClick={() => setLegalModalOpen(true)}>
                <Shield className="h-4 w-4 mr-2" />
                Aceitar Termos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!usePlatform && tenantId && wooviProvider && (
        <WooviCredentialsPanel
          scope="tenant"
          scopeId={tenantId}
          pspProviderId={wooviProvider.id}
        />
      )}

      {tenantId && (
        <LegalAcceptanceModal
          tenantId={tenantId}
          open={legalModalOpen}
          onAccepted={() => {
            setLegalModalOpen(false);
            refreshLegal();
          }}
          onCancel={() => setLegalModalOpen(false)}
        />
      )}
    </div>
  );
}
