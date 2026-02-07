/**
 * PartnerSignup - Public signup page for partner tenants
 * 
 * Creates a new tenant under the partner with the selected plan,
 * handling trial periods and checkout flow.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { usePublicPartner } from '@/contexts/PublicPartnerContext';
import { usePublicPartnerPlans } from '@/hooks/usePartnerResolution';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { z } from 'zod';

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

export default function PartnerSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { partner, isLoading: partnerLoading } = usePublicPartner();
  const { data: plans = [], isLoading: plansLoading } = usePublicPartnerPlans(partner?.partnerId || null);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [step, setStep] = useState<'plan' | 'form'>('plan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [tenantName, setTenantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const branding = partner?.branding;
  const platformName = branding?.platform_name || partner?.partnerName || 'Sistema';
  const logoUrl = branding?.logo_url;

  // Auto-select plan from URL param
  useEffect(() => {
    const planSlug = searchParams.get('plan');
    if (planSlug && plans.length > 0) {
      const plan = plans.find(p => p.slug === planSlug);
      if (plan) {
        setSelectedPlanId(plan.id);
        setStep('form');
      }
    }
  }, [searchParams, plans]);

  // Redirect if not partner domain or no partner found
  useEffect(() => {
    if (!partnerLoading && !partner) {
      const partnerSlug = searchParams.get('partner');
      if (!partnerSlug) {
        navigate('/auth?intent=signup', { replace: true });
      }
    }
  }, [partnerLoading, partner, searchParams, navigate]);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPlan || !partner) {
      setError('Selecione um plano para continuar');
      return;
    }

    try {
      signupSchema.parse({
        tenantName,
        fullName,
        email,
        password,
        confirmPassword,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Call edge function to create partner tenant
      const { data, error: fnError } = await supabase.functions.invoke('partner-tenant-signup', {
        body: {
          partnerId: partner.partnerId,
          planId: selectedPlan.id,
          tenantName,
          adminName: fullName,
          adminEmail: email,
          adminPassword: password,
        },
      });

      if (fnError) throw fnError;

      if (data?.requiresPayment && data?.checkoutUrl) {
        // Redirect to payment
        window.location.href = data.checkoutUrl;
      } else if (data?.success) {
        // Trial or free plan - redirect to login
        navigate('/login?signup=success', { replace: true });
      } else {
        throw new Error(data?.error || 'Erro ao criar conta');
      }
    } catch (err: any) {
      console.error('[PartnerSignup] Error:', err);
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (partnerLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Criar Conta - {platformName}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Logo and branding */}
          <div className="text-center mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt={platformName} className="h-16 w-auto mx-auto mb-4" />
            ) : (
              <h1 className="text-3xl font-bold text-primary mb-4">{platformName}</h1>
            )}
            <p className="text-muted-foreground">
              {step === 'plan' ? 'Escolha seu plano' : 'Complete seu cadastro'}
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
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map(plan => (
                <Card 
                  key={plan.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPlanId === plan.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <CardHeader className="text-center">
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="pt-2">
                      <span className="text-3xl font-bold">
                        {plan.is_free ? 'Grátis' : `R$ ${plan.monthly_price}`}
                      </span>
                      {!plan.is_free && <span className="text-muted-foreground">/mês</span>}
                    </div>
                    {plan.trial_days > 0 && (
                      <Badge variant="secondary">{plan.trial_days} dias grátis</Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {plan.included_features?.slice(0, 4).map((f: string, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-success" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {step === 'plan' && selectedPlanId && (
            <div className="text-center mt-6">
              <Button size="lg" onClick={() => setStep('form')}>
                Continuar com {selectedPlan?.name}
              </Button>
            </div>
          )}

          {/* Step 2: Registration Form */}
          {step === 'form' && selectedPlan && (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Criar Conta</CardTitle>
                    <CardDescription>
                      Plano selecionado: <strong>{selectedPlan.name}</strong>
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setStep('plan')}
                  >
                    Alterar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenantName">Nome do Estabelecimento</Label>
                    <Input
                      id="tenantName"
                      value={tenantName}
                      onChange={e => setTenantName(e.target.value)}
                      placeholder="Meu Restaurante"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Seu Nome</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="João Silva"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedPlan.is_free || selectedPlan.trial_days > 0
                      ? 'Criar Conta'
                      : 'Continuar para Pagamento'}
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
