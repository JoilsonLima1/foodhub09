import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  Key,
  Loader2,
  Info,
  Globe,
  Search,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface SearchEngineVerificationFormProps {
  tenantId: string;
  settingsId?: string;
}

interface VerificationCodes {
  google_verification_code: string | null;
  bing_verification_code: string | null;
}

export function SearchEngineVerificationForm({ tenantId, settingsId }: SearchEngineVerificationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [googleCode, setGoogleCode] = useState('');
  const [bingCode, setBingCode] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current verification codes
  const { data: codes, isLoading } = useQuery({
    queryKey: ['seo-verification-codes', tenantId],
    queryFn: async () => {
      if (!settingsId) return null;

      const { data, error } = await supabase
        .from('marketing_seo_settings')
        .select('google_verification_code, bing_verification_code')
        .eq('id', settingsId)
        .single();

      if (error) throw error;
      return data as VerificationCodes;
    },
    enabled: !!settingsId,
  });

  // Initialize form with existing values
  useEffect(() => {
    if (codes) {
      setGoogleCode(codes.google_verification_code || '');
      setBingCode(codes.bing_verification_code || '');
    }
  }, [codes]);

  // Track changes
  useEffect(() => {
    if (!codes) return;
    const googleChanged = googleCode !== (codes.google_verification_code || '');
    const bingChanged = bingCode !== (codes.bing_verification_code || '');
    setHasChanges(googleChanged || bingChanged);
  }, [googleCode, bingCode, codes]);

  // Save mutation
  const saveCodes = useMutation({
    mutationFn: async () => {
      if (!settingsId) throw new Error('Settings não encontradas');

      const { error } = await supabase
        .from('marketing_seo_settings')
        .update({
          google_verification_code: googleCode || null,
          bing_verification_code: bingCode || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settingsId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-verification-codes'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-seo-settings'] });
      setHasChanges(false);
      toast({
        title: 'Códigos salvos',
        description: 'Os códigos de verificação foram salvos. As meta tags serão injetadas automaticamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settingsId) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Configure um domínio verificado primeiro para habilitar os códigos de verificação.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Códigos de Verificação
        </CardTitle>
        <CardDescription>
          Insira os códigos de verificação fornecidos pelos buscadores. 
          As meta tags serão injetadas automaticamente no seu site.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Search Console */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <Label htmlFor="google-code" className="text-base font-medium">
              Google Search Console
            </Label>
            {codes?.google_verification_code && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configurado
              </Badge>
            )}
          </div>
          <Input
            id="google-code"
            placeholder="Ex: googleXXXXXXXXXXXXXXXX"
            value={googleCode}
            onChange={(e) => setGoogleCode(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Cole apenas o código de verificação (sem a tag HTML completa). 
            Gera: <code className="bg-muted px-1 rounded">&lt;meta name="google-site-verification" content="..."&gt;</code>
          </p>
        </div>

        {/* Bing Webmaster Tools */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-secondary/50 rounded">
              <Search className="h-4 w-4" />
            </div>
            <Label htmlFor="bing-code" className="text-base font-medium">
              Bing Webmaster Tools
            </Label>
            {codes?.bing_verification_code && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configurado
              </Badge>
            )}
          </div>
          <Input
            id="bing-code"
            placeholder="Ex: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            value={bingCode}
            onChange={(e) => setBingCode(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Cole apenas o código de verificação (sem a tag HTML completa). 
            Gera: <code className="bg-muted px-1 rounded">&lt;meta name="msvalidate.01" content="..."&gt;</code>
          </p>
        </div>

        {/* Save Button */}
        <Button 
          onClick={() => saveCodes.mutate()}
          disabled={!hasChanges || saveCodes.isPending}
          className="w-full"
        >
          {saveCodes.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Códigos de Verificação'
          )}
        </Button>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Como obter os códigos:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Acesse o painel do buscador (Google/Bing)</li>
              <li>Adicione seu domínio como propriedade</li>
              <li>Escolha "Tag HTML" como método de verificação</li>
              <li>Copie apenas o valor do atributo <code>content</code></li>
              <li>Cole aqui e salve</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
