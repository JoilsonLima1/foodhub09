/**
 * PublicParceiroCadastro - Partner Registration Page (Marketing)
 * 
 * Self-service signup flow for new partners.
 * Creates auth user + partner record, then redirects to onboarding.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { usePublicTheme } from '@/hooks/usePublicTheme';
import { resetThemeToDefault } from '@/hooks/useBusinessCategory';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Handshake, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import fallbackLogo from '@/assets/logo.png';

export default function PublicParceiroCadastro() {
  useEffect(() => {
    resetThemeToDefault();
  }, []);
  
  usePublicTheme();
  
  const navigate = useNavigate();
  const { branding } = usePublicSettings();
  
  const logoUrl = branding.logo_url || fallbackLogo;
  const companyName = branding.company_name || 'FoodHub09';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    acceptTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.acceptTerms) {
      setError('Você precisa aceitar os termos para continuar.');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/partner/onboarding`,
          data: {
            full_name: formData.name,
            is_partner: true,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Este email já está cadastrado. Faça login ou use outro email.');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!authData.user) {
        setError('Erro ao criar conta. Tente novamente.');
        return;
      }

      // 2. Generate slug from name
      let slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // 3. Complete partner registration
      const { data: partnerData, error: partnerError } = await supabase
        .rpc('complete_partner_registration', {
          p_user_id: authData.user.id,
          p_name: formData.name,
          p_slug: slug,
          p_email: formData.email,
          p_phone: formData.phone || null,
        });

      if (partnerError) {
        console.error('Partner registration error:', partnerError);
        setError('Erro ao criar parceiro. Tente novamente.');
        return;
      }

      const result = partnerData as { success: boolean; redirect_url?: string; message?: string };

      if (!result.success) {
        setError(result.message || 'Erro ao criar parceiro.');
        return;
      }

      toast.success('Conta criada com sucesso!', {
        description: 'Você será redirecionado para o onboarding.',
      });

      // 4. Redirect to partner onboarding
      setTimeout(() => {
        navigate('/partner/onboarding');
      }, 1500);

    } catch (err) {
      console.error('Registration error:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img src={logoUrl} alt={companyName} className="h-12 mx-auto" />
          </Link>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Handshake className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Criar conta de parceiro</h1>
          <p className="text-muted-foreground mt-2">
            Comece a vender o {companyName} com sua marca
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  placeholder="Seu nome ou nome da empresa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, acceptTerms: checked === true })
                  }
                  disabled={isLoading}
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                  Aceito os{' '}
                  <Link to="/termos" className="text-primary hover:underline">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link to="/privacidade" className="text-primary hover:underline">
                    Política de Privacidade
                  </Link>
                </Label>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Criar conta de parceiro
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/auth?intent=login" className="text-primary hover:underline">
                Fazer login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link 
            to="/parceiros" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para página de parceiros
          </Link>
        </div>
      </div>
    </div>
  );
}
