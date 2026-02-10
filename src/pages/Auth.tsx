import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveContext, setDesiredContext } from '@/hooks/useActiveContext';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { resetThemeToDefault } from '@/hooks/useBusinessCategory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CategorySelectorSignup } from '@/components/auth/CategorySelectorSignup';
import { z } from 'zod';
import fallbackLogo from '@/assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  tenantName: z.string().min(2, 'Nome do restaurante deve ter pelo menos 2 caracteres'),
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  businessCategory: z.string().min(1, 'Selecione uma categoria'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const { getDefaultRoute, isLoading: contextLoading } = useActiveContext();
  const { branding } = usePublicSettings();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupTenantName, setSignupTenantName] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupBusinessCategory, setSignupBusinessCategory] = useState('restaurant');

  // Use dynamic branding or fallback
  const logoUrl = branding.logo_url || fallbackLogo;
  const companyName = branding.company_name || 'FoodHub09';

  // Check intent params
  const searchParams = new URLSearchParams(location.search);
  const intent = searchParams.get('intent');
  const context = searchParams.get('context');
  const hasIntent = searchParams.has('intent') || searchParams.has('plan') || searchParams.has('context');
  const hasFromState = !!location.state?.from;

  // IMPORTANT: Reset theme to default on auth page mount
  // Auth page colors must be controlled ONLY by system defaults, not by any tenant theme
  // Also: if context=partner, set desired context so useActiveContext picks it up after login
  useEffect(() => {
    resetThemeToDefault();
    if (context === 'partner') {
      setDesiredContext('partner');
    }
  }, [context]);

  // Handle redirects in useEffect to avoid loops
  useEffect(() => {
    if (authLoading) return; // Wait for auth state to be determined
    
    // Redirect to landing if no intent and not logged in
    if (!user && !hasIntent && !hasFromState) {
      navigate('/', { replace: true });
      return;
    }
    
    // Redirect based on active context if already logged in
    if (user && !contextLoading) {
      // If context=partner, redirect to partner area
      const defaultRoute = context === 'partner' ? '/partner' : getDefaultRoute();
      // CRITICAL: Never send a partner to /dashboard via from state
      const from = location.state?.from?.pathname;
      const safeFrom = from && !from.startsWith('/dashboard') ? from : null;
      const target = safeFrom || defaultRoute;
      console.info('[AUTH_REDIRECT]', { from, contextLoading, activeType: context || 'resolved', defaultRoute, target });
      navigate(target, { replace: true });
    }
  }, [user, authLoading, contextLoading, hasIntent, hasFromState, navigate, location.state, getDefaultRoute, context]);

  // Show loading while auth is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render form if user is logged in (redirect will happen in useEffect)
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
      // Don't redirect immediately - let the useEffect above handle it
      // once contextLoading resolves (ensures partner context is available)
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      signupSchema.parse({
        tenantName: signupTenantName,
        fullName: signupName,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        businessCategory: signupBusinessCategory,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    
    // Pass category along with tenant name
    const { error } = await signUp(
      signupEmail, 
      signupPassword, 
      signupName, 
      signupTenantName,
      signupBusinessCategory
    );
    
    if (error) {
      if (error.message.includes('already registered')) {
        setError('Este email já está cadastrado');
      } else {
        setError(error.message);
      }
    } else {
      // Don't redirect immediately - let the useEffect handle it
      // once context resolves properly
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Fixed header */}
      <header className="shrink-0 bg-background border-b border-border/40">
        <div className="p-3 sm:p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(context === 'partner' ? '/parceiros' : '/')}
            className="w-fit gap-2"
          >
            ← Voltar
          </Button>
        </div>
      </header>

      {/* Main content - scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-4 py-6 sm:py-8">
          <div className="w-full max-w-md flex flex-col items-center">
            {/* Logo and branding - compact on mobile */}
            <div className="flex flex-col items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
              <img 
                src={logoUrl} 
                alt={`${companyName} Logo`} 
                className="h-16 sm:h-24 w-auto cursor-pointer object-contain hover:scale-105 transition-transform"
                onClick={() => navigate('/')} 
              />
              <div className="text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{companyName}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {context === 'partner' ? 'Área do Parceiro' : 'Sistema de Gestão para Restaurantes'}
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

          <Tabs defaultValue={context === 'partner' ? 'login' : (searchParams.get('intent') === 'signup' ? 'signup' : 'login')} className="w-full">
            {context !== 'partner' && (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
            )}
            
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
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
                {context === 'partner' && (
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    Ainda não é parceiro?{' '}
                    <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate('/parceiros/cadastrar')}>
                      Criar conta de parceiro
                    </Button>
                  </p>
                )}
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-tenant">Nome do seu Negócio</Label>
                  <Input
                    id="signup-tenant"
                    type="text"
                    placeholder="Nome do estabelecimento"
                    value={signupTenantName}
                    onChange={(e) => setSignupTenantName(e.target.value)}
                    required
                  />
                </div>

                {/* Business Category Selection */}
                <div className="space-y-2">
                  <Label>Tipo de Negócio</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Escolha a categoria que melhor representa seu negócio
                  </p>
                  <CategorySelectorSignup
                    selectedCategory={signupBusinessCategory}
                    onCategoryChange={setSignupBusinessCategory}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}