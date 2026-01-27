import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Bell, Clock, Image as ImageIcon } from 'lucide-react';
import { useSystemSettings, TrialNotificationSettings as TrialNotificationSettingsType } from '@/hooks/useSystemSettings';
import { ImageUploader } from './ImageUploader';

export function TrialNotificationSettings() {
  const { trialNotifications, isLoading, updateSetting } = useSystemSettings();

  const [notificationData, setNotificationData] = useState<TrialNotificationSettingsType>({
    days_before_expiration: 3,
    show_frequency_hours: 24,
    banner_image_url: null,
    banner_type: 'warning',
    show_expiration_datetime: true,
  });

  useEffect(() => {
    if (trialNotifications) {
      setNotificationData(trialNotifications);
    }
  }, [trialNotifications]);

  const handleSave = () => {
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

        <Button onClick={handleSave} disabled={updateSetting.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações de Notificação
        </Button>
      </CardContent>
    </Card>
  );
}
