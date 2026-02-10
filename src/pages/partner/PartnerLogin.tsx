/**
 * PartnerLogin - Dedicated login page for partner users.
 * Route: /partner/auth
 * 
 * This is a completely isolated login flow that ALWAYS redirects
 * to /partner/auth/callback after successful authentication.
 * It never touches the tenant login flow.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { resetThemeToDefault } from '@/hooks/useBusinessCategory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { z } from 'zod';
import fallbackLogo from '@/assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export default function PartnerLogin() {
  const navigate = useNavigate();
  const { signIn, user, isLoading: authLoading } = useAuth();
  const { branding } = usePublicSettings();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoUrl = branding.logo_url || fallbackLogo;
  const companyName = branding.company_name || 'FoodHub09';

  useEffect(() => {
    resetThemeToDefault();
  }, []);

  // If user is already logged in, go straight to callback
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/partner/auth/callback', { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      loginSchema.parse({ email, password });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      setError(
        error.message.includes('Invalid login credentials')
          ? 'Email ou senha incorretos'
          : error.message
      );
      setIsLoading(false);
      return;
    }

    // After successful login, navigate to partner callback
    // The useEffect above will also catch this, but let's be explicit
    navigate('/partner/auth/callback', { replace: true });
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="shrink-0 bg-background border-b border-border/40">
        <div className="p-3 sm:p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/parceiros')}
            className="w-fit gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-4 py-6 sm:py-8">
          <div className="w-full max-w-md flex flex-col items-center">
            <div className="flex flex-col items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
              <img
                src={logoUrl}
                alt={`${companyName} Logo`}
                className="h-16 sm:h-24 w-auto object-contain"
              />
              <div className="text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{companyName}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Área do Parceiro
                </p>
              </div>
            </div>

            <Card className="w-full border-0 shadow-none bg-transparent">
              <CardContent className="pt-0 px-0">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="partner-email">Email</Label>
                    <Input
                      id="partner-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="partner-password">Senha</Label>
                    <Input
                      id="partner-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar como Parceiro
                  </Button>

                  <p className="text-center text-sm text-muted-foreground mt-3">
                    Ainda não é parceiro?{' '}
                    <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate('/parceiros/cadastrar')}>
                      Criar conta de parceiro
                    </Button>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
