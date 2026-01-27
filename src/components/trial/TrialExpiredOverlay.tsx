import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Crown, ArrowRight, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePublicSettings } from '@/hooks/usePublicSettings';

interface TrialExpiredOverlayProps {
  featureName?: string;
}

export function TrialExpiredOverlay({ featureName }: TrialExpiredOverlayProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { branding, trialPeriod } = usePublicSettings();
  const [isLoading, setIsLoading] = useState(false);

  const trialDays = trialPeriod?.days ?? 14;

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth?intent=login');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId: 'starter' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar checkout',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="max-w-md mx-4 shadow-2xl border-primary/20">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Período de Teste Expirado</CardTitle>
          <CardDescription className="text-base">
            {featureName 
              ? `O acesso à funcionalidade "${featureName}" está bloqueado.`
              : 'Seu período de teste gratuito terminou.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data preservation notice */}
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <Database className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Seus dados estão seguros!</p>
              <p className="text-sm text-muted-foreground">
                Todos os seus dados foram preservados. Ao assinar, você terá acesso imediato a tudo.
              </p>
            </div>
          </div>

          {/* Trial info */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Você aproveitou <strong>{trialDays} dias</strong> de acesso completo a todas as funcionalidades.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-3">
            <Button 
              size="lg" 
              className="w-full"
              onClick={handleUpgrade}
              disabled={isLoading}
            >
              <Crown className="h-5 w-5 mr-2" />
              {isLoading ? 'Carregando...' : 'Assinar Agora'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/')}
            >
              Ver Planos Disponíveis
            </Button>
          </div>

          {/* Support link */}
          <p className="text-center text-xs text-muted-foreground">
            Dúvidas? Entre em contato com nosso suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
