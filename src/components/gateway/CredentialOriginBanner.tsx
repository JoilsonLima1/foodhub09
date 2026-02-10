import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PasswordConfirmDialog } from './PasswordConfirmDialog';
import { Database, ArrowUpCircle, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface CredentialOriginBannerProps {
  provider: string;
  scopeType: 'platform' | 'partner' | 'tenant';
  scopeId?: string | null;
  onPromoted?: () => void;
}

interface FoundCredential {
  source: 'provider_accounts' | 'legacy_gateways';
  id: string;
  scope_type: string;
  scope_id: string | null;
  environment: string;
  provider: string;
  status: string;
  updated_at: string;
  has_credentials: boolean;
  credentials_preview?: string;
}

export function CredentialOriginBanner({ provider, scopeType, scopeId, onPromoted }: CredentialOriginBannerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [selectedSource, setSelectedSource] = useState<FoundCredential | null>(null);

  // Fetch all payment_provider_accounts for this provider
  const { data: allAccounts } = useQuery({
    queryKey: ['all-provider-accounts', provider],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_provider_accounts')
        .select('*')
        .eq('provider', provider)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch legacy payment_gateways for this provider
  const { data: legacyGateways } = useQuery({
    queryKey: ['legacy-gateways', provider],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('provider', provider)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Build found credentials list
  const foundCredentials: FoundCredential[] = [];

  allAccounts?.forEach(acc => {
    const creds = acc.credentials_encrypted as Record<string, string> | null;
    const hasRealCreds = creds && Object.values(creds).some(v => v && String(v).length > 5);
    foundCredentials.push({
      source: 'provider_accounts',
      id: acc.id,
      scope_type: acc.scope_type,
      scope_id: acc.scope_id,
      environment: acc.environment,
      provider: acc.provider,
      status: acc.status,
      updated_at: acc.updated_at,
      has_credentials: !!hasRealCreds,
    });
  });

  legacyGateways?.forEach(gw => {
    const hasKey = gw.api_key_masked && gw.api_key_masked.length > 10;
    foundCredentials.push({
      source: 'legacy_gateways',
      id: gw.id,
      scope_type: 'legacy',
      scope_id: null,
      environment: gw.api_key_masked?.startsWith('$aact_prod_') || gw.api_key_masked?.startsWith('sk_live_') || gw.api_key_masked?.startsWith('pk_live_') ? 'production' : 'sandbox',
      provider: gw.provider,
      status: gw.is_active ? 'active' : 'inactive',
      updated_at: gw.created_at,
      has_credentials: !!hasKey,
      credentials_preview: hasKey ? `${gw.api_key_masked!.slice(0, 12)}...${gw.api_key_masked!.slice(-4)}` : undefined,
    });
  });

  // Determine active credential source
  const platformAccount = foundCredentials.find(
    c => c.source === 'provider_accounts' && c.scope_type === 'platform' && c.has_credentials
  );
  const activeCredential = platformAccount || foundCredentials.find(c => c.has_credentials);
  const isUsingLegacy = activeCredential?.source === 'legacy_gateways';
  const needsPromotion = scopeType === 'platform' && !platformAccount && activeCredential;

  // Promote mutation
  const promoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSource) throw new Error('Nenhuma credencial selecionada');

      let credentialsToPromote: Record<string, string> = {};

      if (selectedSource.source === 'legacy_gateways') {
        const { data: gw } = await supabase
          .from('payment_gateways')
          .select('*')
          .eq('id', selectedSource.id)
          .single();
        if (!gw) throw new Error('Gateway não encontrado');

        if (provider === 'asaas') {
          credentialsToPromote = { api_key: gw.api_key_masked || '' };
        } else if (provider === 'stripe') {
          credentialsToPromote = { secret_key: gw.api_key_masked || '' };
        } else {
          credentialsToPromote = { api_key: gw.api_key_masked || '' };
        }
      } else {
        const { data: acc } = await supabase
          .from('payment_provider_accounts')
          .select('*')
          .eq('id', selectedSource.id)
          .single();
        if (!acc) throw new Error('Conta não encontrada');
        credentialsToPromote = (acc.credentials_encrypted as Record<string, string>) || {};
      }

      // Try upsert first, then fallback to insert
      const insertPayload = {
        provider,
        scope_type: 'platform' as const,
        scope_id: null,
        environment: selectedSource.environment || 'production',
        integration_type: provider === 'stone' ? 'stone_online' : 'online',
        credentials_encrypted: credentialsToPromote as any,
        status: 'active',
      };

      const { error } = await supabase
        .from('payment_provider_accounts')
        .upsert(insertPayload as any, { onConflict: 'provider,scope_type,scope_id,environment' });

      if (error) {
        const { error: insertErr } = await supabase
          .from('payment_provider_accounts')
          .insert(insertPayload as any);
        if (insertErr) throw insertErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-account'] });
      queryClient.invalidateQueries({ queryKey: ['all-provider-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['legacy-gateways'] });
      toast({ title: 'Credencial promovida para Plataforma com sucesso!' });
      onPromoted?.();
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao promover', description: err.message, variant: 'destructive' });
    },
  });

  if (!foundCredentials.length) return null;

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4 text-primary" />
            Origem das Credenciais
          </div>

          {activeCredential && (
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {isUsingLegacy ? (
                  <Badge variant="outline" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Tabela Legada (payment_gateways)
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {activeCredential.scope_type}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {activeCredential.environment}
                </Badge>
                <Badge variant={activeCredential.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {activeCredential.status}
                </Badge>
              </div>
              {activeCredential.credentials_preview && (
                <p className="text-xs text-muted-foreground font-mono">
                  Chave: {activeCredential.credentials_preview}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Atualizado: {format(new Date(activeCredential.updated_at), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
          )}

          {/* All found credentials */}
          {foundCredentials.length > 1 && (
            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">
                Todas as credenciais encontradas ({foundCredentials.length}):
              </p>
              {foundCredentials.map((cred, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-background border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {cred.source === 'legacy_gateways' ? 'legado' : cred.scope_type}
                    </Badge>
                    <span>{cred.environment}</span>
                    <span className={cred.has_credentials ? 'text-green-600' : 'text-muted-foreground'}>
                      {cred.has_credentials ? '● com chave' : '○ sem chave'}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {format(new Date(cred.updated_at), 'dd/MM/yy HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Promote CTA */}
          {needsPromotion && (
            <Alert className="border-primary/30">
              <ArrowUpCircle className="h-4 w-4" />
              <AlertDescription className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm">
                    {isUsingLegacy
                      ? 'Credencial encontrada na tabela legada. Promova para o sistema atual.'
                      : `Credencial encontrada em "${activeCredential?.scope_type}". Promova para escopo "platform".`}
                  </span>
                  <Button
                    size="sm"
                    variant="default"
                    className="shrink-0"
                    onClick={() => {
                      setSelectedSource(activeCredential!);
                      setShowPromoteConfirm(true);
                    }}
                    disabled={promoteMutation.isPending}
                  >
                    {promoteMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    <ArrowUpCircle className="h-3 w-3 mr-1" />
                    Promover para Plataforma
                  </Button>
                </div>

                {/* Explanation block */}
                <div className="space-y-2 text-xs text-muted-foreground border-t pt-2">
                  <div>
                    <p className="font-medium text-foreground mb-1">O que acontece ao promover:</p>
                    <p>Copiamos (UPSERT) a credencial encontrada na tabela legada ou escopo atual para o escopo PLATFORM (payment_provider_accounts scope_type="platform").</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">O que NÃO acontece:</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      <li>Não apagamos a credencial original (legado continua funcionando).</li>
                      <li>Não alteramos IDs do provedor nem o gateway ativo do tenant.</li>
                      <li>Não interrompe cobranças ou checkouts em andamento.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">Quando usar:</p>
                    <p>Quando você quer que a plataforma use uma credencial "master" (central) para todos os tenants, ou para facilitar a gestão no Super Admin.</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="font-medium">Segurança: exige confirmação de senha.</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <PasswordConfirmDialog
        open={showPromoteConfirm}
        onOpenChange={setShowPromoteConfirm}
        title="Promover credencial para Plataforma"
        description="A credencial será copiada para o escopo 'platform'. A credencial original não será apagada."
        onConfirm={() => promoteMutation.mutateAsync()}
      />
    </>
  );
}
