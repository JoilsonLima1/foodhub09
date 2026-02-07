/**
 * PartnerAuthPage - Branded authentication for partner app domains
 * 
 * This page provides a white-labeled login/signup experience
 * for users accessing a partner's app domain (e.g., app.partner.com).
 * 
 * Features:
 * - Partner branding (logo, colors, name)
 * - No platform references
 * - Proper post-login routing (partner_user → /partner, tenant_user → /dashboard)
 * - noindex meta tag (app domains should never be indexed)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicPartner } from '@/contexts/PublicPartnerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export default function PartnerAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, isLoading: authLoading } = useAuth();
  const { partner, isLoading: partnerLoading } = usePublicPartner();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Partner branding
  const branding = partner?.branding;
  const platformName = branding?.platform_name || partner?.partnerName || 'Sistema';
  const logoUrl = branding?.logo_url;
  const supportEmail = branding?.support_email;

  // Check intent params
  const searchParams = new URLSearchParams(location.search);
  const intent = searchParams.get('intent') || 'login';

  // Handle redirects after auth
  useEffect(() => {
    if (authLoading) return;
    
    if (user) {
      // Redirect to appropriate dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location.state]);

  // Show loading while resolving
  if (authLoading || partnerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render form if user is logged in
  if (user) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos');
      } else {
        setError(error.message);
      }
    } else {
      navigate('/dashboard');
    }
    
    setIsLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Entrar | {platformName}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content={`Acesse sua conta no ${platformName}`} />
      </Helmet>

      <div className="min-h-[100dvh] bg-background flex flex-col">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
            <div className="w-full max-w-md flex flex-col items-center">
              {/* Logo and branding */}
              <div className="flex flex-col items-center gap-4 mb-8">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={`${platformName} Logo`} 
                    className="h-20 w-auto object-contain"
                  />
                ) : (
                  <div className="h-20 w-20 bg-primary/10 rounded-xl flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">
                      {platformName.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-foreground">{platformName}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Acesse sua conta para continuar
                  </p>
                </div>
              </div>
        
              <Card className="w-full border shadow-lg">
                <CardContent className="pt-6">
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Tabs defaultValue={intent === 'signup' ? 'signup' : 'login'} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="login">Entrar</TabsTrigger>
                      <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="login">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                            className="h-11"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="login-password">Senha</Label>
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            className="h-11"
                          />
                        </div>
                        
                        <Button type="submit" className="w-full h-11" disabled={isLoading}>
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Entrar
                        </Button>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="signup">
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Para criar uma nova conta, acesse nosso site principal.</p>
                        {partner?.partnerSlug && (
                          <Button 
                            variant="link" 
                            className="mt-2"
                            onClick={() => {
                              // Try to navigate to marketing domain
                              const marketingDomain = window.location.hostname.replace('app.', 'www.');
                              window.location.href = `https://${marketingDomain}/signup`;
                            }}
                          >
                            Ir para cadastro
                          </Button>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Support footer */}
              {supportEmail && (
                <p className="text-sm text-muted-foreground mt-6 text-center">
                  Precisa de ajuda?{' '}
                  <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">
                    {supportEmail}
                  </a>
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
