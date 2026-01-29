import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Check, 
  X, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  AlertTriangle, 
  Lock, 
  Loader2,
  Shield,
  Minus,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  description: string | null;
  display_order?: number;
  max_users: number | null;
  max_products: number | null;
  max_orders_per_month?: number | null;
  feature_pos: boolean | null;
  feature_kitchen_display?: boolean | null;
  feature_stock_control: boolean | null;
  feature_ai_forecast: boolean | null;
  feature_reports_basic: boolean | null;
  feature_reports_advanced: boolean | null;
  feature_delivery_management: boolean | null;
  feature_multi_branch?: boolean | null;
  feature_api_access?: boolean | null;
  feature_white_label?: boolean | null;
  feature_priority_support?: boolean | null;
  feature_custom_integrations?: boolean | null;
  feature_cmv_reports?: boolean | null;
  feature_goal_notifications?: boolean | null;
  feature_courier_app?: boolean | null;
  feature_public_menu?: boolean | null;
}

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: SubscriptionPlan | null;
  targetPlan: SubscriptionPlan;
  onSuccess: () => void;
}

// Feature definitions with labels
const FEATURE_DEFINITIONS: Record<string, { label: string; category: 'limit' | 'feature' }> = {
  max_users: { label: 'Usuários', category: 'limit' },
  max_products: { label: 'Produtos', category: 'limit' },
  max_orders_per_month: { label: 'Pedidos por mês', category: 'limit' },
  feature_pos: { label: 'PDV/Caixa', category: 'feature' },
  feature_kitchen_display: { label: 'Painel da Cozinha', category: 'feature' },
  feature_stock_control: { label: 'Controle de Estoque', category: 'feature' },
  feature_ai_forecast: { label: 'Previsões com IA', category: 'feature' },
  feature_reports_basic: { label: 'Relatórios Básicos', category: 'feature' },
  feature_reports_advanced: { label: 'Relatórios Avançados', category: 'feature' },
  feature_delivery_management: { label: 'Gestão de Entregas', category: 'feature' },
  feature_multi_branch: { label: 'Multi-Unidades', category: 'feature' },
  feature_api_access: { label: 'Acesso à API', category: 'feature' },
  feature_white_label: { label: 'White Label', category: 'feature' },
  feature_priority_support: { label: 'Suporte Prioritário', category: 'feature' },
  feature_custom_integrations: { label: 'Integrações Customizadas', category: 'feature' },
  feature_cmv_reports: { label: 'Relatório CMV', category: 'feature' },
  feature_goal_notifications: { label: 'Metas e Notificações', category: 'feature' },
  feature_courier_app: { label: 'App do Entregador', category: 'feature' },
  feature_public_menu: { label: 'Cardápio Online', category: 'feature' },
};

type ChangeType = 'upgrade' | 'downgrade' | 'same';

export function PlanChangeDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  onSuccess,
}: PlanChangeDialogProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'comparison' | 'password' | 'confirm'>('comparison');
  const [password, setPassword] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Determine if this is an upgrade or downgrade
  const changeType = useMemo((): ChangeType => {
    if (!currentPlan) return 'upgrade';
    
    // Use display_order if available, otherwise use price
    const currentOrder = currentPlan.display_order ?? currentPlan.monthly_price;
    const targetOrder = targetPlan.display_order ?? targetPlan.monthly_price;
    
    if (targetOrder > currentOrder) return 'upgrade';
    if (targetOrder < currentOrder) return 'downgrade';
    return 'same';
  }, [currentPlan, targetPlan]);

  // Get features for a plan
  const getPlanFeatures = (plan: SubscriptionPlan): Record<string, any> => {
    const features: Record<string, any> = {};
    
    for (const key of Object.keys(FEATURE_DEFINITIONS)) {
      if (key in plan) {
        features[key] = (plan as any)[key];
      }
    }
    
    return features;
  };

  // Compare features and find gains/losses
  const featureComparison = useMemo(() => {
    const currentFeatures = currentPlan ? getPlanFeatures(currentPlan) : {};
    const targetFeatures = getPlanFeatures(targetPlan);
    
    const gained: { key: string; label: string; value: any }[] = [];
    const lost: { key: string; label: string; value: any }[] = [];
    const kept: { key: string; label: string; value: any }[] = [];
    
    for (const [key, def] of Object.entries(FEATURE_DEFINITIONS)) {
      const currentValue = currentFeatures[key];
      const targetValue = targetFeatures[key];
      
      // Skip if both are null/undefined/false
      if (!currentValue && !targetValue) continue;
      
      // Handle boolean features
      if (typeof targetValue === 'boolean' || typeof currentValue === 'boolean') {
        if (targetValue && !currentValue) {
          gained.push({ key, label: def.label, value: targetValue });
        } else if (!targetValue && currentValue) {
          lost.push({ key, label: def.label, value: currentValue });
        } else if (targetValue && currentValue) {
          kept.push({ key, label: def.label, value: targetValue });
        }
      }
      // Handle numeric limits
      else if (typeof targetValue === 'number' || typeof currentValue === 'number') {
        const cv = currentValue ?? 0;
        const tv = targetValue ?? 0;
        
        // -1 means unlimited
        if (tv === -1 && cv !== -1) {
          gained.push({ key, label: def.label, value: 'Ilimitado' });
        } else if (cv === -1 && tv !== -1) {
          lost.push({ key, label: def.label, value: `${cv} → ${tv}` });
        } else if (tv > cv) {
          gained.push({ key, label: def.label, value: `${cv} → ${tv}` });
        } else if (tv < cv) {
          lost.push({ key, label: def.label, value: `${cv} → ${tv}` });
        } else if (tv === cv && tv > 0) {
          kept.push({ key, label: def.label, value: tv === -1 ? 'Ilimitado' : tv });
        }
      }
    }
    
    return { gained, lost, kept };
  }, [currentPlan, targetPlan]);

  // Format limit value for display
  const formatLimitValue = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    if (value === -1) return 'Ilimitado';
    return value.toString();
  };

  // Verify password
  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setPasswordError('Digite sua senha');
      return;
    }

    setIsVerifyingPassword(true);
    setPasswordError(null);

    try {
      // Re-authenticate with password
      const { error } = await supabase.auth.signInWithPassword({
        email: session?.user?.email || '',
        password: password,
      });

      if (error) {
        setPasswordError('Senha incorreta. Tente novamente.');
        return;
      }

      // Password verified, proceed to confirmation
      setStep('confirm');
    } catch (error: any) {
      setPasswordError(error.message || 'Erro ao verificar senha');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Execute plan change
  const handleChangePlan = async () => {
    if (!session?.access_token) {
      toast({
        title: 'Erro de autenticação',
        description: 'Faça login novamente para continuar',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPlan(true);

    try {
      const { data, error } = await supabase.functions.invoke('change-plan', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          targetPlanId: targetPlan.id,
          changeType: changeType,
          currentPlanId: currentPlan?.id || null,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: changeType === 'upgrade' ? 'Upgrade realizado! 🎉' : 'Plano alterado',
        description: changeType === 'downgrade' 
          ? `Seu plano foi alterado para ${targetPlan.name}. Algumas funcionalidades foram desativadas.`
          : `Seu plano foi alterado para ${targetPlan.name} com sucesso!`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Plan change error:', error);
      toast({
        title: 'Erro ao alterar plano',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPlan(false);
    }
  };

  // Handle next step
  const handleNext = () => {
    if (changeType === 'downgrade') {
      setStep('password');
    } else {
      setStep('confirm');
    }
  };

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep('comparison');
      setPassword('');
      setPasswordError(null);
    }
    onOpenChange(open);
  };

  // Get title based on step
  const getTitle = () => {
    switch (step) {
      case 'comparison':
        return changeType === 'upgrade' ? 'Fazer Upgrade de Plano' : 'Alterar Plano';
      case 'password':
        return 'Confirmação de Segurança';
      case 'confirm':
        return 'Confirmar Alteração';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {changeType === 'upgrade' ? (
              <ArrowUp className="h-5 w-5 text-green-600" />
            ) : (
              <ArrowDown className="h-5 w-5 text-yellow-600" />
            )}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {step === 'comparison' && (
              changeType === 'upgrade' 
                ? 'Compare os benefícios e confirme o upgrade do seu plano'
                : 'Compare os planos e confirme a alteração'
            )}
            {step === 'password' && 'Para sua segurança, confirme sua senha para continuar'}
            {step === 'confirm' && 'Revise as alterações e confirme a mudança de plano'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Comparison */}
        {step === 'comparison' && (
          <div className="space-y-6">
            {/* Change Type Badge */}
            <div className="flex justify-center">
              <Badge 
                className={cn(
                  'text-sm py-1 px-3',
                  changeType === 'upgrade' 
                    ? 'bg-green-500/10 text-green-600 border-green-500/30'
                    : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                )}
              >
                {changeType === 'upgrade' ? (
                  <>
                    <ArrowUp className="h-4 w-4 mr-1" />
                    Upgrade de Plano
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-4 w-4 mr-1" />
                    Downgrade de Plano
                  </>
                )}
              </Badge>
            </div>

            {/* Side by Side Comparison */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Current Plan */}
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    Plano Atual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{currentPlan?.name || 'Sem plano'}</h3>
                    {currentPlan && (
                      <p className="text-2xl font-bold">
                        R$ {currentPlan.monthly_price}
                        <span className="text-sm font-normal text-muted-foreground">/mês</span>
                      </p>
                    )}
                  </div>
                  
                  {currentPlan && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Funcionalidades</p>
                      <ul className="space-y-1.5 text-sm">
                        {Object.entries(getPlanFeatures(currentPlan)).map(([key, value]) => {
                          if (!value) return null;
                          const def = FEATURE_DEFINITIONS[key];
                          if (!def) return null;
                          
                          return (
                            <li key={key} className="flex items-center gap-2">
                              <Check className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {def.label}
                                {typeof value === 'number' && (
                                  <span className="ml-1 font-medium">
                                    ({formatLimitValue(value)})
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Target Plan */}
              <Card className={cn(
                'border-2',
                changeType === 'upgrade' ? 'border-green-500/50' : 'border-yellow-500/50'
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      changeType === 'upgrade' ? 'bg-green-500' : 'bg-yellow-500'
                    )} />
                    Novo Plano
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{targetPlan.name}</h3>
                    <p className="text-2xl font-bold">
                      R$ {targetPlan.monthly_price}
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Funcionalidades</p>
                    <ul className="space-y-1.5 text-sm">
                      {Object.entries(getPlanFeatures(targetPlan)).map(([key, value]) => {
                        if (!value) return null;
                        const def = FEATURE_DEFINITIONS[key];
                        if (!def) return null;
                        
                        const isGained = featureComparison.gained.some(g => g.key === key);
                        
                        return (
                          <li key={key} className="flex items-center gap-2">
                            <Check className={cn(
                              'h-3.5 w-3.5',
                              isGained ? 'text-green-500' : 'text-muted-foreground'
                            )} />
                            <span className={cn(
                              isGained ? 'text-green-600 font-medium' : 'text-muted-foreground'
                            )}>
                              {def.label}
                              {typeof value === 'number' && (
                                <span className="ml-1">
                                  ({formatLimitValue(value)})
                                </span>
                              )}
                              {isGained && (
                                <Badge variant="outline" className="ml-2 text-xs bg-green-500/10 text-green-600 border-green-500/30">
                                  Novo
                                </Badge>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gains Section */}
            {featureComparison.gained.length > 0 && (
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Plus className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium text-green-700 dark:text-green-400">
                      Você vai ganhar:
                    </h4>
                  </div>
                  <ul className="grid grid-cols-2 gap-2">
                    {featureComparison.gained.map((feature) => (
                      <li key={feature.key} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{feature.label}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Losses Section (Downgrade) */}
            {changeType === 'downgrade' && featureComparison.lost.length > 0 && (
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h4 className="font-medium text-red-700 dark:text-red-400">
                      Você perderá acesso a:
                    </h4>
                  </div>
                  <ul className="grid grid-cols-2 gap-2">
                    {featureComparison.lost.map((feature) => (
                      <li key={feature.key} className="flex items-center gap-2 text-sm">
                        <X className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">{feature.label}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Downgrade Warning */}
            {changeType === 'downgrade' && (
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">
                    Atenção: Downgrade de Plano
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ao fazer downgrade, você perderá imediatamente o acesso às funcionalidades 
                    listadas acima. Essa ação requer confirmação por senha.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Password Confirmation (Downgrade only) */}
        {step === 'password' && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Lock className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Confirmação de Segurança</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Para continuar com o downgrade, digite sua senha
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyPassword();
                    }
                  }}
                  className={passwordError ? 'border-red-500' : ''}
                />
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">
                  Essa verificação é necessária para proteger sua conta contra alterações não autorizadas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Final Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={cn(
                'p-3 rounded-full',
                changeType === 'upgrade' ? 'bg-green-500/10' : 'bg-yellow-500/10'
              )}>
                {changeType === 'upgrade' ? (
                  <ArrowUp className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  Confirmar {changeType === 'upgrade' ? 'Upgrade' : 'Downgrade'}
                </h3>
              </div>
            </div>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plano Atual:</span>
                  <span className="font-medium">{currentPlan?.name || 'Nenhum'}</span>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Novo Plano:</span>
                  <span className="font-medium">{targetPlan.name}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Novo Valor:</span>
                  <span className="font-bold text-lg">R$ {targetPlan.monthly_price}/mês</span>
                </div>
              </CardContent>
            </Card>

            {changeType === 'downgrade' && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-red-700 dark:text-red-400">
                    Você confirma a troca para o plano {targetPlan.name}?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Funcionalidades removidas serão desativadas imediatamente após a confirmação.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === 'comparison' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleNext}
                className={changeType === 'upgrade' ? '' : 'bg-yellow-600 hover:bg-yellow-700'}
              >
                {changeType === 'upgrade' ? 'Confirmar Upgrade' : 'Continuar'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}

          {step === 'password' && (
            <>
              <Button variant="outline" onClick={() => setStep('comparison')}>
                Voltar
              </Button>
              <Button 
                onClick={handleVerifyPassword}
                disabled={isVerifyingPassword || !password.trim()}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {isVerifyingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Verificar Senha
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep(changeType === 'downgrade' ? 'password' : 'comparison')}
              >
                Voltar
              </Button>
              <Button 
                onClick={handleChangePlan}
                disabled={isChangingPlan}
                className={changeType === 'upgrade' ? '' : 'bg-yellow-600 hover:bg-yellow-700'}
              >
                {isChangingPlan ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : changeType === 'upgrade' ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar Upgrade
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Confirmar Downgrade
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
