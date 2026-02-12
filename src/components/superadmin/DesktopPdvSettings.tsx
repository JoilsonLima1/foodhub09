import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Monitor, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FormState {
  windows_url: string;
  mac_url: string;
  default_port: string;
}

export function DesktopPdvSettings() {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({ windows_url: '#', mac_url: '#', default_port: '8123' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'desktop_pdv_windows_url',
          'desktop_pdv_mac_url',
          'desktop_pdv_default_port',
        ]);

      if (!error && data) {
        const next = { ...form };
        for (const row of data) {
          const val = row.setting_value as unknown;
          if (row.setting_key === 'desktop_pdv_windows_url') next.windows_url = String(val || '#');
          if (row.setting_key === 'desktop_pdv_mac_url') next.mac_url = String(val || '#');
          if (row.setting_key === 'desktop_pdv_default_port') next.default_port = String(val || '8123');
        }
        setForm(next);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { setting_key: 'desktop_pdv_windows_url', setting_value: JSON.stringify(form.windows_url) },
        { setting_key: 'desktop_pdv_mac_url', setting_value: JSON.stringify(form.mac_url) },
        { setting_key: 'desktop_pdv_default_port', setting_value: JSON.stringify(Number(form.default_port) || 8123) },
      ];

      for (const u of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ setting_value: u.setting_value })
          .eq('setting_key', u.setting_key);
        if (error) throw error;
      }

      toast({ title: 'Salvo!', description: 'Configurações do Desktop PDV atualizadas.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          FoodHub PDV Desktop
        </CardTitle>
        <CardDescription>
          Configure as URLs de download e porta padrão do Desktop PDV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>URL Download Windows (.exe)</Label>
          <Input
            value={form.windows_url}
            onChange={(e) => setForm(prev => ({ ...prev, windows_url: e.target.value }))}
            placeholder="https://cdn.example.com/FoodHubPrint-Setup.exe"
          />
        </div>
        <div className="space-y-2">
          <Label>URL Download macOS (.dmg)</Label>
          <Input
            value={form.mac_url}
            onChange={(e) => setForm(prev => ({ ...prev, mac_url: e.target.value }))}
            placeholder="https://cdn.example.com/FoodHubPrint.dmg"
          />
        </div>
        <div className="space-y-2">
          <Label>Porta Padrão do Desktop PDV</Label>
          <Input
            type="number"
            value={form.default_port}
            onChange={(e) => setForm(prev => ({ ...prev, default_port: e.target.value }))}
            placeholder="8123"
            className="max-w-[150px]"
          />
          <p className="text-xs text-muted-foreground">
            Porta usada pelo Desktop PDV na máquina do lojista. Valor padrão: 8123.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
