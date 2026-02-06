import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { FileText, Plus, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useMarketingSEO } from '@/hooks/useMarketingSEO';

export function SEOPagesTab() {
  const { pages, isLoading } = useMarketingSEO();

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default">Excelente</Badge>;
    if (score >= 60) return <Badge variant="secondary">Bom</Badge>;
    if (score >= 40) return <Badge variant="outline">Regular</Badge>;
    return <Badge variant="destructive">Precisa Melhorar</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Páginas do Site
              </CardTitle>
              <CardDescription>
                Analise e otimize o SEO de cada página do seu site
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Página
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : pages.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium">Nenhuma página cadastrada</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione as páginas do seu site para analisar e otimizar o SEO.
                </p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Página
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Página</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-mono text-sm">{page.page_path}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {page.page_title || <span className="text-muted-foreground">Não definido</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={page.overall_score} className="w-16 h-2" />
                        <span className="text-sm">{page.overall_score}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getScoreBadge(page.overall_score)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tips for page optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 Como Otimizar suas Páginas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Título da Página
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Entre 50-60 caracteres</li>
                <li>• Inclua a palavra-chave principal</li>
                <li>• Seja descritivo e atraente</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Meta Descrição
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Entre 150-160 caracteres</li>
                <li>• Resuma o conteúdo da página</li>
                <li>• Inclua uma chamada para ação</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                URL da Página
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use palavras-chave na URL</li>
                <li>• Evite caracteres especiais</li>
                <li>• Mantenha curta e descritiva</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Imagens
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Adicione texto alternativo (alt)</li>
                <li>• Otimize o tamanho dos arquivos</li>
                <li>• Use nomes de arquivo descritivos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
