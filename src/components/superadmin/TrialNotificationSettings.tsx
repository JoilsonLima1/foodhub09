import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Bell, Clock, Image as ImageIcon, Gift, Calendar, Lock, AlertTriangle } from 'lucide-react';
import { useSystemSettings, TrialNotificationSettings as TrialNotificationSettingsType, TrialSettings } from '@/hooks/useSystemSettings';
import { ImageUploader } from './ImageUploader';

export function TrialNotificationSettings() {
  const { trialNotifications, trialPeriod, isLoading, updateSetting } = useSystemSettings();

  // Trial Period Settings
  const [trialData, setTrialData] = useState<TrialSettings>({
    days: 14,
    highlight_text: '14 dias grátis',
    end_date: null,
  });

  // Notification Settings
  const [notificationData, setNotificationData] = useState<TrialNotificationSettingsType>({
    days_before_expiration: 3,
    show_frequency_hours: 24,
    banner_image_url: null,
    banner_type: 'warning',
    show_expiration_datetime: true,
  });

  useEffect(() => {
    if (trialPeriod) {
      setTrialData(trialPeriod);
    }
    if (trialNotifications) {
      setNotificationData(trialNotifications);
    }
  }, [trialPeriod, trialNotifications]);

  // Auto-update highlight text when days change
  useEffect(() => {
    const newHighlightText = `${trialData.days} dias grátis`;
    if (trialData.highlight_text !== newHighlightText && !trialData.highlight_text.includes('grátis')) {
      setTrialData(prev => ({ ...prev, highlight_text: newHighlightText }));
    }
  }, [trialData.days]);

  const handleSaveTrialPeriod = () => {
    updateSetting.mutate({ 
      key: 'trial_period',
      value: trialData
    });
  };

  const handleSaveNotifications = () => {
    updateSetting.mutate({ 
      key: 'trial_notifications',
      value: notificationData
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="trial-period" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="trial-period" className="flex items-center gap-2">
          <Gift className="h-4 w-4" />
          Período de Teste
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notificações
        </TabsTrigger>
      </TabsList>

      {/* Trial Period Configuration */}
      <TabsContent value="trial-period">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Configurações do Período de Teste Gratuito
            </CardTitle>
            <CardDescription>
              Configure quantos dias de acesso completo os novos usuários terão antes de precisar assinar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Trial Days Setting */}
            <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-6 w-6 text-primary" />
                <div>
                  <Label className="text-lg font-semibold">Dias de Teste Gratuito</Label>
                  <p className="text-sm text-muted-foreground">
                    Durante este período, o cliente terá acesso a TODAS as funcionalidades
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={trialData.days}
                  onChange={(e) => setTrialData({
                    ...trialData,
                    days: parseInt(e.target.value) || 14,
                  })}
                  className="w-24 text-xl font-bold text-center"
                />
                <span className="text-lg">dias</span>
              </div>
            </div>

            {/* Highlight Text */}
            <div className="space-y-2">
              <Label>Texto de Destaque (Landing Page)</Label>
              <Input
                value={trialData.highlight_text}
                onChange={(e) => setTrialData({
                  ...trialData,
                  highlight_text: e.target.value,
                })}
                placeholder="Ex: 14 dias grátis"
              />
              <p className="text-xs text-muted-foreground">
                Este texto aparece nos botões e banners da landing page
              </p>
            </div>

            {/* What happens during/after trial */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg bg-green-500/5 border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="h-5 w-5 text-green-500" />
                  <h4 className="font-medium text-green-700">Durante o Trial</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Acesso a TODAS as funcionalidades</li>
                  <li>✓ PDV completo</li>
                  <li>✓ Gestão de estoque</li>
                  <li>✓ Relatórios avançados</li>
                  <li>✓ Previsões com IA</li>
                  <li>✓ Dashboard de entregas</li>
                  <li>✓ Sem limites de produtos/pedidos</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg bg-red-500/5 border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-5 w-5 text-red-500" />
                  <h4 className="font-medium text-red-700">Após o Trial Expirar</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Dados permanecem salvos</li>
                  <li>✗ Acesso às funcionalidades bloqueado</li>
                  <li>✓ Pode assinar a qualquer momento</li>
                  <li>✓ Recupera acesso imediato após assinatura</li>
                  <li>✓ Sem perda de histórico</li>
                </ul>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">📢 Texto que aparecerá na Landing Page:</p>
              <div className="space-y-2 text-sm">
                <p>• Botão: <strong>"Teste Grátis por {trialData.days} Dias"</strong></p>
                <p>• Banner: <strong>"{trialData.highlight_text}"</strong></p>
                <p>• Seção de planos: <strong>"Planos pagos incluem {trialData.days} dias grátis"</strong></p>
              </div>
            </div>

            <Button onClick={handleSaveTrialPeriod} disabled={updateSetting.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações do Trial
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notification Settings */}
      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações de Expiração do Trial
            </CardTitle>
            <CardDescription>
              Configure quando e como avisar os usuários sobre a expiração do período de teste
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timing Settings */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Dias antes da expiração para notificar
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={notificationData.days_before_expiration}
                  onChange={(e) => setNotificationData({
                    ...notificationData,
                    days_before_expiration: parseInt(e.target.value) || 3,
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  O banner começará a aparecer X dias antes da expiração
                </p>
              </div>

              <div className="space-y-2">
                <Label>Frequência de exibição (horas)</Label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={notificationData.show_frequency_hours}
                  onChange={(e) => setNotificationData({
                    ...notificationData,
                    show_frequency_hours: parseInt(e.target.value) || 24,
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Após fechar, o banner reaparecerá depois de X horas
                </p>
              </div>
            </div>

            {/* Banner Type */}
            <div className="space-y-2">
              <Label>Tipo de Banner</Label>
              <Select
                value={notificationData.banner_type}
                onValueChange={(value: 'info' | 'warning' | 'critical') => 
                  setNotificationData({ ...notificationData, banner_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      Informativo (Azul)
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      Aviso (Amarelo)
                    </div>
                  </SelectItem>
                  <SelectItem value="critical">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      Crítico (Vermelho)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Banner Image */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Imagem do Banner (opcional)
              </Label>
              <ImageUploader
                value={notificationData.banner_image_url}
                onChange={(url) => setNotificationData({ ...notificationData, banner_image_url: url })}
                label="Imagem promocional"
                description="Imagem que aparecerá no banner de notificação (recomendado: 200x80px)"
                folder="trial-banners"
                maxSizeMB={2}
                removeBackground={false}
              />
            </div>

            {/* Display Options */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Mostrar data e hora de expiração</Label>
                <p className="text-xs text-muted-foreground">
                  Exibe a data e hora exata de quando o trial expira
                </p>
              </div>
              <Switch
                checked={notificationData.show_expiration_datetime}
                onCheckedChange={(checked) => setNotificationData({
                  ...notificationData,
                  show_expiration_datetime: checked,
                })}
              />
            </div>

            {/* Preview */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Prévia do comportamento:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Banner aparecerá <strong>{notificationData.days_before_expiration} dias</strong> antes da expiração</li>
                <li>• Após fechado, reaparecerá em <strong>{notificationData.show_frequency_hours} horas</strong></li>
                <li>• Estilo: <strong>{notificationData.banner_type === 'info' ? 'Informativo' : notificationData.banner_type === 'warning' ? 'Aviso' : 'Crítico'}</strong></li>
                <li>• Data/hora: <strong>{notificationData.show_expiration_datetime ? 'Visível' : 'Oculta'}</strong></li>
              </ul>
            </div>

            <Button onClick={handleSaveNotifications} disabled={updateSetting.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações de Notificação
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
