import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Grid, List, Monitor, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PrinterSettings } from './PrinterSettings';

type DisplayMode = 'list' | 'grid_images';

interface POSConfig {
  displayMode: DisplayMode;
  allowCashierModeChange: boolean;
}

export function POSSettings() {
  const { tenantId, roles } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<POSConfig>({
    displayMode: 'list',
    allowCashierModeChange: false,
  });

  const isAdmin = roles.includes('admin') || roles.includes('manager');

  useEffect(() => {
    async function fetchConfig() {
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('pos_display_mode, pos_allow_cashier_mode_change')
          .eq('id', tenantId)
          .single();

        if (error) throw error;

        if (data) {
          setConfig({
            displayMode: (data.pos_display_mode as DisplayMode) || 'list',
            allowCashierModeChange: data.pos_allow_cashier_mode_change || false,
          });
        }
      } catch (error) {
        console.error('Error fetching POS config:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchConfig();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          pos_display_mode: config.displayMode,
          pos_allow_cashier_mode_change: config.allowCashierModeChange,
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'As configurações do PDV foram atualizadas.',
      });
    } catch (error) {
      console.error('Error saving POS config:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Apenas administradores podem acessar essas configurações.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Modo de Exibição Padrão
          </CardTitle>
          <CardDescription>
            Escolha como os produtos serão exibidos no PDV por padrão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={config.displayMode}
            onValueChange={(value: DisplayMode) => 
              setConfig(prev => ({ ...prev, displayMode: value }))
            }
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="relative">
              <RadioGroupItem
                value="list"
                id="mode-list"
                className="peer sr-only"
              />
              <Label
                htmlFor="mode-list"
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-muted bg-card p-6 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              >
                <List className="h-10 w-10" />
                <div className="text-center">
                  <p className="font-semibold">Lista Normal</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Botões com nome e preço
                  </p>
                </div>
              </Label>
            </div>

            <div className="relative">
              <RadioGroupItem
                value="grid_images"
                id="mode-grid"
                className="peer sr-only"
              />
              <Label
                htmlFor="mode-grid"
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-muted bg-card p-6 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              >
                <Grid className="h-10 w-10" />
                <div className="text-center">
                  <p className="font-semibold">Grade com Imagens</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ideal para sorveteria, açaiteria, padaria
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissões do Caixa</CardTitle>
          <CardDescription>
            Controle o que o operador de caixa pode alterar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Permitir alteração do modo de exibição</Label>
              <p className="text-sm text-muted-foreground">
                O caixa poderá trocar entre lista e grade durante a operação
              </p>
            </div>
            <Switch
              checked={config.allowCashierModeChange}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, allowCashierModeChange: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Salvando...
          </>
        ) : (
          'Salvar Configurações'
        )}
      </Button>

      {/* Printer Settings */}
      <PrinterSettings />
    </div>
  );
}
