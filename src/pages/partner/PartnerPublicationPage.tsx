/**
 * PartnerPublicationPage - Manage landing page publication status
 * 
 * Allows partners to:
 * - View domain verification status
 * - Preview their landing page
 * - Publish/unpublish their landing
 * - See SEO status
 */

import { useState } from 'react';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { usePartnerPublicationStatus } from '@/hooks/usePartnerResolution';
import { usePartnerDomains } from '@/hooks/usePartners';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Globe,
  CheckCircle,
  XCircle,
  Eye,
  Rocket,
  AlertTriangle,
  ExternalLink,
  Search,
  Loader2,
  Ban,
} from 'lucide-react';

export default function PartnerPublicationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentPartner } = usePartnerContext();
  const { data: status, isLoading } = usePartnerPublicationStatus(currentPartner?.id || null);
  const { domains } = usePartnerDomains(currentPartner?.id || '');
  
  const [isPublishing, setIsPublishing] = useState(false);

  const marketingDomain = domains.find(d => d.domain_type === 'marketing');
  const appDomain = domains.find(d => d.domain_type === 'app');

  const handlePublish = async (publish: boolean) => {
    if (!currentPartner?.id) return;
    
    setIsPublishing(true);
    
    try {
      const { error } = await supabase
        .rpc('publish_partner_landing', { 
          p_partner_id: currentPartner.id,
          p_publish: publish 
        });
      
      if (error) throw error;
      
      toast({
        title: publish ? 'Landing publicada!' : 'Landing despublicada',
        description: publish 
          ? 'Sua landing page está agora disponível para indexação.'
          : 'Sua landing page foi removida da indexação.',
      });
      
      queryClient.invalidateQueries({ queryKey: ['partner-publication-status'] });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o status de publicação.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePreview = () => {
    if (marketingDomain?.domain) {
      window.open(`https://${marketingDomain.domain}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Publicação</h1>
          <p className="text-muted-foreground">Gerencie a publicação da sua landing page</p>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const canPublish = status?.marketing_domain_verified && status?.has_branding && status?.has_marketing_page;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Publicação</h1>
        <p className="text-muted-foreground">
          Gerencie a publicação da sua landing page white-label
        </p>
      </div>

      {/* Publication Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Status da Publicação
              </CardTitle>
              <CardDescription>
                Controle se sua landing page está visível para o público
              </CardDescription>
            </div>
            {status?.is_published ? (
              <Badge className="bg-success text-success-foreground">
                <CheckCircle className="h-3 w-3 mr-1" />
                Publicada
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Não publicada
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.is_published && status?.published_at && (
            <p className="text-sm text-muted-foreground">
              Publicada em: {new Date(status.published_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {marketingDomain?.domain && (
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Pré-visualizar
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            )}

            {status?.is_published ? (
              <Button 
                variant="destructive" 
                onClick={() => handlePublish(false)}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4 mr-2" />
                )}
                Despublicar
              </Button>
            ) : (
              <Button 
                onClick={() => handlePublish(true)}
                disabled={isPublishing || !canPublish}
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                Publicar Landing
              </Button>
            )}
          </div>

          {!canPublish && !status?.is_published && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Requisitos pendentes</AlertTitle>
              <AlertDescription>
                Para publicar sua landing, você precisa:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {!status?.marketing_domain_verified && (
                    <li>Verificar um domínio de marketing</li>
                  )}
                  {!status?.has_branding && (
                    <li>Configurar o branding</li>
                  )}
                  {!status?.has_marketing_page && (
                    <li>Criar uma página de marketing</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Domains Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Status dos Domínios
          </CardTitle>
          <CardDescription>
            Domínios configurados para sua plataforma white-label
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Marketing Domain */}
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Domínio de Marketing</span>
                {status?.marketing_domain_verified ? (
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verificado
                  </Badge>
                ) : status?.marketing_domain ? (
                  <Badge variant="secondary">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                ) : (
                  <Badge variant="outline">Não configurado</Badge>
                )}
              </div>
              {status?.marketing_domain ? (
                <p className="text-sm text-muted-foreground font-mono">
                  {status.marketing_domain}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Configure um domínio para sua landing page
                </p>
              )}
            </div>

            {/* App Domain */}
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Domínio do App</span>
                {status?.app_domain_verified ? (
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verificado
                  </Badge>
                ) : status?.app_domain ? (
                  <Badge variant="secondary">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                ) : (
                  <Badge variant="outline">Não configurado</Badge>
                )}
              </div>
              {status?.app_domain ? (
                <p className="text-sm text-muted-foreground font-mono">
                  {status.app_domain}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Configure um domínio para o aplicativo
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            SEO e Indexação
          </CardTitle>
          <CardDescription>
            Informações sobre indexação nos mecanismos de busca
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Domínio de Marketing</h4>
              <p className="text-sm text-muted-foreground">
                {status?.is_published ? (
                  <>
                    <CheckCircle className="inline h-4 w-4 text-success mr-1" />
                    Indexável pelos motores de busca
                  </>
                ) : (
                  <>
                    <XCircle className="inline h-4 w-4 text-muted-foreground mr-1" />
                    Não indexável (noindex) - publique para ativar
                  </>
                )}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Domínio do App</h4>
              <p className="text-sm text-muted-foreground">
                <XCircle className="inline h-4 w-4 text-muted-foreground mr-1" />
                Nunca indexável (protegido)
              </p>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Sitemap e Robots.txt:</strong> São gerados automaticamente com base no status
              de publicação. Quando publicada, sua landing será incluída no sitemap e permitida no robots.txt.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
