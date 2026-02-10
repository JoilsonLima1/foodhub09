/**
 * PartnerSlugSignup - Signup page accessed via /parceiros/:slug/começar
 * 
 * Resolves partner from URL slug (not domain), creates tenant linked to partner.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Check, AlertCircle, Star } from 'lucide-react';
import { z } from 'zod';
import fallbackLogo from '@/assets/logo.png';

const signupSchema = z.object({
  tenantName: z.string().min(2, 'Nome do estabelecimento deve ter pelo menos 2 caracteres'),
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

interface PartnerProfile {
  found: boolean;
  partner_id?: string;
  name?: string;
  slug?: string;
  branding?: {
    logo_url?: string;
    platform_name?: string;
    primary_color?: string;
  };
}

export default function PartnerSlugSignup() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const planParam = searchParams.get('plan');

  // Resolve partner from slug
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['public-partner-profile', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug not provided');
      const { data, error } = await supabase.rpc('get_public_partner_profile', { p_slug: slug });
      if (error) throw error;
      return data as unknown as PartnerProfile;
    },
    enabled: !!slug,
  });

  // Fetch partner plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['public-partner-plans', profile?.partner_id],
    queryFn: async () => {
      if (!profile?.partner_id) return [];
      const { data, error } = await supabase
        .from('partner_plans')
        .select('*')
        .eq('partner_id', profile.partner_id)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.partner_id,
  });

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [step, setStep] = useState<'plan' | 'form'>('plan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Auto-select plan from URL
  useEffect(() => {
    if (planParam && plans.length > 0) {
      const plan = plans.find(p => p.id === planParam || p.slug === planParam);
      if (plan) {
        setSelectedPlanId(plan.id);
        setStep('form');
      }
    }
  }, [planParam, plans]);

  const platformName = profile?.branding?.platform_name || profile?.name || 'Sistema';
  const logoUrl = profile?.branding?.logo_url || fallbackLogo;
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPlan || !profile?.partner_id) {
      setError('Selecione um plano para continuar');
      return;
    }

    try {
      signupSchema.parse({ tenantName, fullName, email, password, confirmPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('partner-tenant-signup', {
        body: {
          partnerId: profile.partner_id,
          planId: selectedPlan.id,
          tenantName,
          adminName: fullName,
          adminEmail: email,
          adminPassword: password,
        },
      });

      if (fnError) throw fnError;

      if (data?.requiresPayment && data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data?.success) {
        navigate('/login?signup=success', { replace: true });
      } else {
        throw new Error(data?.error || 'Erro ao criar conta');
      }
    } catch (err: any) {
      console.error('[PartnerSlugSignup] Error:', err);
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profileLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.found) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Parceiro não encontrado</h2>
            <p className="text-muted-foreground mb-4">O parceiro que você está procurando não existe.</p>
            <Button asChild><Link to="/">Voltar</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Criar Conta - {platformName}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(`/parceiros/${slug}`)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <img src={logoUrl} alt={platformName} className="h-8 w-auto object-contain" />
              <span className="font-semibold">{platformName}</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Crie sua conta</h1>
            <p className="text-muted-foreground">
              {step === 'plan' ? 'Escolha o plano ideal para seu negócio' : 'Complete seu cadastro'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 max-w-md mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Plan Selection */}
          {step === 'plan' && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((plan: any) => (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all hover:shadow-md relative ${
                      selectedPlanId === plan.id ? 'ring-2 ring-primary' : ''
                    } ${plan.is_featured ? 'border-primary' : ''}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    {plan.is_featured && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        <Star className="h-3 w-3 mr-1" /> Mais Popular
                      </Badge>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="pt-2">
                        <span className="text-3xl font-bold">
                          {plan.is_free ? 'Grátis' : `R$ ${Number(plan.monthly_price).toFixed(2).replace('.', ',')}`}
                        </span>
                        {!plan.is_free && <span className="text-muted-foreground">/mês</span>}
                      </div>
                      {plan.trial_days > 0 && (
                        <Badge variant="secondary">{plan.trial_days} dias grátis</Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {plan.max_users && (
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            Até {plan.max_users} usuários
                          </li>
                        )}
                        {plan.max_products && (
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            Até {plan.max_products} produtos
                          </li>
                        )}
                        {(plan.included_features || []).slice(0, 4).map((f: string, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {selectedPlanId && (
                <div className="text-center mt-6">
                  <Button size="lg" onClick={() => setStep('form')}>
                    Continuar com {selectedPlan?.name}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Step 2: Registration Form */}
          {step === 'form' && selectedPlan && (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Criar Conta</CardTitle>
                    <CardDescription>
                      Plano: <strong>{selectedPlan.name}</strong>
                      {selectedPlan.trial_days > 0 && ` — ${selectedPlan.trial_days} dias grátis`}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep('plan')}>
                    Alterar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenantName">Nome do Estabelecimento *</Label>
                    <Input id="tenantName" value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="Meu Restaurante" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Seu Nome *</Label>
                    <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="João Silva" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedPlan.is_free || selectedPlan.trial_days > 0 ? 'Criar Conta' : 'Continuar para Pagamento'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </>
  );
}
