import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Upload, Palette } from 'lucide-react';
import { usePartnerBranding, PartnerBranding } from '@/hooks/usePartners';

interface PartnerBrandingPanelProps {
  partnerId: string;
}

export function PartnerBrandingPanel({ partnerId }: PartnerBrandingPanelProps) {
  const { branding, isLoading, updateBranding } = usePartnerBranding(partnerId);
  const [formData, setFormData] = useState<Partial<PartnerBranding>>({});

  useEffect(() => {
    if (branding) {
      setFormData(branding);
    }
  }, [branding]);

  const handleSave = async () => {
    await updateBranding.mutateAsync(formData);
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Visual Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Identidade Visual
          </CardTitle>
          <CardDescription>
            Personalize cores e logos para o parceiro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>URL do Logo</Label>
              <Input
                value={formData.logo_url || ''}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>URL do Favicon</Label>
              <Input
                value={formData.favicon_url || ''}
                onChange={(e) => setFormData({ ...formData, favicon_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cor Primária (HSL)</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.primary_color || ''}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  placeholder="220 70% 50%"
                />
                {formData.primary_color && (
                  <div
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: `hsl(${formData.primary_color})` }}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor Secundária (HSL)</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.secondary_color || ''}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  placeholder="200 60% 45%"
                />
                {formData.secondary_color && (
                  <div
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: `hsl(${formData.secondary_color})` }}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor de Destaque (HSL)</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.accent_color || ''}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  placeholder="45 90% 55%"
                />
                {formData.accent_color && (
                  <div
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: `hsl(${formData.accent_color})` }}
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Plataforma</CardTitle>
          <CardDescription>
            Textos e informações de contato exibidas aos usuários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Plataforma</Label>
              <Input
                value={formData.platform_name || ''}
                onChange={(e) => setFormData({ ...formData, platform_name: e.target.value })}
                placeholder="Nome exibido no lugar de 'Lovable'"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail de Suporte</Label>
              <Input
                type="email"
                value={formData.support_email || ''}
                onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                placeholder="suporte@parceiro.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone de Suporte</Label>
              <Input
                value={formData.support_phone || ''}
                onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label>URL dos Termos de Uso</Label>
              <Input
                value={formData.terms_url || ''}
                onChange={(e) => setFormData({ ...formData, terms_url: e.target.value })}
                placeholder="https://parceiro.com/termos"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>URL da Política de Privacidade</Label>
            <Input
              value={formData.privacy_url || ''}
              onChange={(e) => setFormData({ ...formData, privacy_url: e.target.value })}
              placeholder="https://parceiro.com/privacidade"
            />
          </div>
        </CardContent>
      </Card>

      {/* Landing Page */}
      <Card>
        <CardHeader>
          <CardTitle>Landing Page</CardTitle>
          <CardDescription>
            Textos exibidos na página inicial do parceiro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título Principal (Hero)</Label>
            <Input
              value={formData.hero_title || ''}
              onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
              placeholder="Transforme seu negócio"
            />
          </div>
          <div className="space-y-2">
            <Label>Subtítulo</Label>
            <Textarea
              value={formData.hero_subtitle || ''}
              onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
              placeholder="Descrição do serviço oferecido pelo parceiro"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateBranding.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Branding
        </Button>
      </div>
    </div>
  );
}
