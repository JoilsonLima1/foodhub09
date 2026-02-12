import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Smartphone, Save, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function SmartPosGlobalSettings() {
  const { toast } = useToast();
  const [secret, setSecret] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'smartpos_device_secret')
        .maybeSingle();

      if (!error && data) {
        const val = data.setting_value as unknown as string;
        if (val && val.length > 0) {
          setSecret(val);
          setHasExisting(true);
        }
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const generateSecret = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    setSecret(hex);
  };

  const handleSave = async () => {
    if (!secret.trim()) {
      toast({ title: 'Secret vazio', description: 'Gere ou insira um secret antes de salvar.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: JSON.stringify(secret.trim()) })
        .eq('setting_key', 'smartpos_device_secret');

      if (error) throw error;

      setHasExisting(true);
      toast({ title: 'Salvo!', description: 'Secret do SmartPOS atualizado com sucesso.' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
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
          <Smartphone className="h-5 w-5" />
          SmartPOS – Chave de Autenticação de Dispositivos
        </CardTitle>
        <CardDescription>
          Chave secreta usada para gerar e validar tokens HMAC-SHA256 dos dispositivos SmartPOS.
          Alterar esta chave invalidará todos os dispositivos pareados existentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Device Secret (HMAC Key)</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Cole ou gere um secret..."
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="outline" onClick={generateSecret} title="Gerar aleatoriamente">
              <RefreshCw className="h-4 w-4 mr-2" />
              Gerar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasExisting
              ? '⚠️ Um secret já está configurado. Alterar invalidará tokens existentes.'
              : 'Nenhum secret configurado. Gere um para ativar a autenticação HMAC dos dispositivos.'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Secret
        </Button>
      </CardContent>
    </Card>
  );
}
