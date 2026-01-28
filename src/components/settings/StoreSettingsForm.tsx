import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useStoreSettings, StoreSettings } from '@/hooks/useStoreSettings';

export function StoreSettingsForm() {
  const { settings, isLoading, isSaving, updateSettings } = useStoreSettings();
  const [formData, setFormData] = useState<StoreSettings>(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (field: keyof StoreSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
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
        <CardTitle>Informações da Loja</CardTitle>
        <CardDescription>
          Dados básicos do seu estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="store-name">Nome do Estabelecimento</Label>
              <Input
                id="store-name"
                placeholder="Nome da sua loja"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-phone">Telefone</Label>
              <Input
                id="store-phone"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-email">Email</Label>
              <Input
                id="store-email"
                type="email"
                placeholder="contato@loja.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-whatsapp">WhatsApp</Label>
              <Input
                id="store-whatsapp"
                placeholder="(11) 99999-9999"
                value={formData.whatsapp_number}
                onChange={(e) => handleChange('whatsapp_number', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-address">Endereço</Label>
            <Input
              id="store-address"
              placeholder="Rua, número, bairro"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="store-city">Cidade</Label>
              <Input
                id="store-city"
                placeholder="Cidade"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-state">Estado</Label>
              <Input
                id="store-state"
                placeholder="UF"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-zip">CEP</Label>
              <Input
                id="store-zip"
                placeholder="00000-000"
                value={formData.zip_code}
                onChange={(e) => handleChange('zip_code', e.target.value)}
              />
            </div>
          </div>
          <div className="pt-4 border-t mt-6">
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
