import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Copy, 
  Check,
  Search,
  Globe,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useMarketingSEO } from '@/hooks/useMarketingSEO';
import { OrganizationDomain } from '@/hooks/useOrganizationDomains';
import { useToast } from '@/hooks/use-toast';

interface SearchConsoleGuideTabProps {
  domain: OrganizationDomain | undefined;
}

export function SearchConsoleGuideTab({ domain }: SearchConsoleGuideTabProps) {
  const { toast } = useToast();
  const { settings, updateSearchConsoleStatus, getSitemapUrl } = useMarketingSEO();
  const [copied, setCopied] = useState<string | null>(null);

  const sitemapUrl = getSitemapUrl(domain?.domain);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast({ title: 'Copiado!' });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleMarkVerified = async (platform: 'google' | 'bing') => {
    await updateSearchConsoleStatus.mutateAsync({ platform, verified: true });
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Cadastro nos Buscadores
          </CardTitle>
          <CardDescription>
            Siga este guia passo a passo para cadastrar seu site nos principais buscadores.
            Isso ajuda seu site a aparecer nos resultados de busca mais rapidamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Este guia apenas orienta você. Nenhuma ação é feita automaticamente.
              Você precisará acessar cada plataforma e seguir os passos manualmente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Google Search Console */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Google Search Console</CardTitle>
                <CardDescription>O principal buscador do mundo</CardDescription>
              </div>
            </div>
            {settings?.google_search_console_verified ? (
              <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" /> Verificado</Badge>
            ) : (
              <Badge variant="secondary"><Circle className="h-3 w-3 mr-1" /> Pendente</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="step1">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">Passo 1</Badge>
                  Acessar o Google Search Console
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>Acesse o Google Search Console clicando no botão abaixo:</p>
                <Button variant="outline" asChild>
                  <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Google Search Console
                  </a>
                </Button>
                <p className="text-muted-foreground">
                  Você precisará fazer login com uma conta Google.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step2">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">Passo 2</Badge>
                  Adicionar sua propriedade
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>1. Clique em <strong>"Adicionar propriedade"</strong></p>
                <p>2. Escolha <strong>"Prefixo do URL"</strong></p>
                <p>3. Digite o endereço do seu site:</p>
                {domain && (
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-3 py-2 rounded flex-1">
                      https://{domain.domain}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(`https://${domain.domain}`, 'domain')}
                    >
                      {copied === 'domain' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step3">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">Passo 3</Badge>
                  Verificar propriedade
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>O Google oferece várias formas de verificação. A mais simples é:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Tag HTML:</strong> Adicione uma meta tag no seu site</li>
                  <li><strong>Registro DNS:</strong> Adicione um registro TXT no seu domínio</li>
                  <li><strong>Google Analytics:</strong> Se já usa, a verificação é automática</li>
                </ul>
                <p className="text-muted-foreground">
                  Siga as instruções na tela do Google Search Console.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step4">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">Passo 4</Badge>
                  Enviar Sitemap
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>Após verificar, envie seu sitemap:</p>
                <p>1. No menu lateral, clique em <strong>"Sitemaps"</strong></p>
                <p>2. Cole a URL do seu sitemap:</p>
                {sitemapUrl && (
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-3 py-2 rounded flex-1 text-xs">
                      {sitemapUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(sitemapUrl, 'sitemap-google')}
                    >
                      {copied === 'sitemap-google' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
                <p>3. Clique em <strong>"Enviar"</strong></p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {!settings?.google_search_console_verified && (
            <Button 
              onClick={() => handleMarkVerified('google')}
              disabled={updateSearchConsoleStatus.isPending}
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar como Verificado
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Bing Webmaster Tools */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/50 rounded-lg">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Bing Webmaster Tools</CardTitle>
                <CardDescription>Buscador da Microsoft (também alimenta Yahoo, DuckDuckGo)</CardDescription>
              </div>
            </div>
            {settings?.bing_webmaster_verified ? (
              <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" /> Verificado</Badge>
            ) : (
              <Badge variant="secondary"><Circle className="h-3 w-3 mr-1" /> Pendente</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="bing-step1">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">Passo 1</Badge>
                  Acessar Bing Webmaster Tools
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <Button variant="outline" asChild>
                  <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Bing Webmaster Tools
                  </a>
                </Button>
                <p className="text-muted-foreground">
                  Você pode usar sua conta Microsoft ou importar do Google Search Console.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="bing-step2">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">Passo 2</Badge>
                  Importar do Google (recomendado)
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p>Se já configurou o Google Search Console, você pode importar:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Clique em <strong>"Importar"</strong></li>
                  <li>Faça login com sua conta Google</li>
                  <li>Selecione os sites para importar</li>
                  <li>Pronto! Seus sitemaps também serão importados</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {!settings?.bing_webmaster_verified && (
            <Button 
              onClick={() => handleMarkVerified('bing')}
              disabled={updateSearchConsoleStatus.isPending}
              variant="outline"
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar como Verificado
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 Dicas Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Tempo de indexação:</strong> Após o cadastro, pode levar de alguns dias 
            a algumas semanas para seu site aparecer nos resultados de busca.
          </p>
          <p>
            <strong>Acompanhe regularmente:</strong> Use as ferramentas para monitorar 
            erros de indexação e melhorar seu posicionamento.
          </p>
          <p>
            <strong>Não tente burlar:</strong> Técnicas de "black hat SEO" podem resultar 
            em penalizações e remoção do seu site dos resultados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
