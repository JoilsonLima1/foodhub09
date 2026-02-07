/**
 * PartnerBranding - Manage partner branding settings
 */

import { useState, useEffect } from 'react';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { usePartnerBranding } from '@/hooks/usePartners';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, Image, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PartnerBrandingPage() {
  const { currentPartner } = usePartnerContext();
  const { branding, isLoading, updateBranding } = usePartnerBranding(currentPartner?.id || '');

  const [formData, setFormData] = useState({
    platform_name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '',
    secondary_color: '',
    accent_color: '',
    support_email: '',
    support_phone: '',
    terms_url: '',
    privacy_url: '',
    hero_title: '',
    hero_subtitle: '',
  });

  useEffect(() => {
    if (branding) {
      setFormData({
        platform_name: branding.platform_name || '',
        logo_url: branding.logo_url || '',
        favicon_url: branding.favicon_url || '',
        primary_color: branding.primary_color || '',
        secondary_color: branding.secondary_color || '',
        accent_color: branding.accent_color || '',
        support_email: branding.support_email || '',
        support_phone: branding.support_phone || '',
        terms_url: branding.terms_url || '',
        privacy_url: branding.privacy_url || '',
        hero_title: branding.hero_title || '',
        hero_subtitle: branding.hero_subtitle || '',
      });
    }
  }, [branding]);

  const handleSave = () => {
    updateBranding.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Branding</h1>
          <p className="text-muted-foreground">Personalize a aparência da sua plataforma</p>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Branding</h1>
          <p className="text-muted-foreground">
            Personalize a aparência da sua plataforma white-label
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateBranding.isPending}>
          {updateBranding.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Alterações
        </Button>
      </div>

      {/* Identidade Visual */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Identidade Visual</CardTitle>
          </div>
          <CardDescription>Logos e imagens da sua marca</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Plataforma</Label>
            <Input
              value={formData.platform_name}
              onChange={(e) => setFormData(prev => ({ ...prev, platform_name: e.target.value }))}
              placeholder="Nome exibido na plataforma"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>URL do Logo</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://..."
              />
              {formData.logo_url && (
                <img src={formData.logo_url} alt="Logo" className="h-12 mt-2 object-contain" />
              )}
            </div>
            <div className="space-y-2">
              <Label>URL do Favicon</Label>
              <Input
                value={formData.favicon_url}
                onChange={(e) => setFormData(prev => ({ ...prev, favicon_url: e.target.value }))}
                placeholder="https://..."
              />
              {formData.favicon_url && (
                <img src={formData.favicon_url} alt="Favicon" className="h-8 mt-2 object-contain" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cores */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Cores</CardTitle>
          </div>
          <CardDescription>Cores HSL da sua marca (ex: 220 70% 50%)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.primary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                  placeholder="220 70% 50%"
                />
                {formData.primary_color && (
                  <div 
                    className="w-10 h-10 rounded border shrink-0"
                    style={{ backgroundColor: `hsl(${formData.primary_color})` }}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.secondary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                  placeholder="220 30% 80%"
                />
                {formData.secondary_color && (
                  <div 
                    className="w-10 h-10 rounded border shrink-0"
                    style={{ backgroundColor: `hsl(${formData.secondary_color})` }}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor de Destaque</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.accent_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                  placeholder="45 100% 50%"
                />
                {formData.accent_color && (
                  <div 
                    className="w-10 h-10 rounded border shrink-0"
                    style={{ backgroundColor: `hsl(${formData.accent_color})` }}
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Landing Page */}
      <Card>
        <CardHeader>
          <CardTitle>Landing Page</CardTitle>
          <CardDescription>Textos exibidos na página inicial</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título Hero</Label>
            <Input
              value={formData.hero_title}
              onChange={(e) => setFormData(prev => ({ ...prev, hero_title: e.target.value }))}
              placeholder="O melhor sistema para seu negócio"
            />
          </div>
          <div className="space-y-2">
            <Label>Subtítulo Hero</Label>
            <Input
              value={formData.hero_subtitle}
              onChange={(e) => setFormData(prev => ({ ...prev, hero_subtitle: e.target.value }))}
              placeholder="Gerencie tudo em um só lugar"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suporte */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Suporte e Legal</CardTitle>
          </div>
          <CardDescription>Informações de contato e documentos legais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>E-mail de Suporte</Label>
              <Input
                type="email"
                value={formData.support_email}
                onChange={(e) => setFormData(prev => ({ ...prev, support_email: e.target.value }))}
                placeholder="suporte@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone de Suporte</Label>
              <Input
                value={formData.support_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, support_phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>URL dos Termos de Uso</Label>
              <Input
                value={formData.terms_url}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>URL da Política de Privacidade</Label>
              <Input
                value={formData.privacy_url}
                onChange={(e) => setFormData(prev => ({ ...prev, privacy_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
