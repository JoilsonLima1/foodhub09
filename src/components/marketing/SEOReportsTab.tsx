import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  FileText,
  Calendar
} from 'lucide-react';
import { useMarketingSEO } from '@/hooks/useMarketingSEO';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SEOReportsTab() {
  const { reports, settings, runAudit, isLoading } = useMarketingSEO();

  const latestReport = reports[0];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-primary';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Run Audit */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Auditoria de SEO
              </CardTitle>
              <CardDescription>
                Execute uma análise completa do SEO do seu site
              </CardDescription>
            </div>
            <Button 
              onClick={() => runAudit.mutate()}
              disabled={runAudit.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${runAudit.isPending ? 'animate-spin' : ''}`} />
              {runAudit.isPending ? 'Analisando...' : 'Nova Auditoria'}
            </Button>
          </div>
        </CardHeader>
        {settings?.last_audit_at && (
          <CardContent>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Última auditoria: {format(new Date(settings.last_audit_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Latest Report */}
      {latestReport && (
        <Card>
          <CardHeader>
            <CardTitle>Último Relatório</CardTitle>
            <CardDescription>
              {format(new Date(latestReport.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Score */}
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(latestReport.overall_score)}`}>
                {latestReport.overall_score}%
              </div>
              <p className="text-muted-foreground mt-1">Score Geral de SEO</p>
            </div>

            {/* Score Breakdown */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-semibold">{latestReport.technical_score}%</div>
                <p className="text-sm text-muted-foreground">SEO Técnico</p>
                <Progress value={latestReport.technical_score} className="mt-2 h-2" />
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-semibold">{latestReport.meta_score}%</div>
                <p className="text-sm text-muted-foreground">Meta Tags</p>
                <Progress value={latestReport.meta_score} className="mt-2 h-2" />
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-semibold">{latestReport.content_score}%</div>
                <p className="text-sm text-muted-foreground">Conteúdo</p>
                <Progress value={latestReport.content_score} className="mt-2 h-2" />
              </div>
            </div>

            {/* Issues Summary */}
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="font-medium">{latestReport.critical_issues}</span>
                <span className="text-muted-foreground">Críticos</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">{latestReport.warnings}</span>
                <span className="text-muted-foreground">Avisos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-medium">{latestReport.recommendations}</span>
                <span className="text-muted-foreground">Sugestões</span>
              </div>
            </div>

            {Array.isArray(latestReport.recommendations_list) && latestReport.recommendations_list.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Recomendações</h4>
                <div className="space-y-2">
                  {(latestReport.recommendations_list as Array<{priority: string; message: string}>).map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'} className="mt-0.5">
                        {rec.priority === 'high' ? 'Alta' : 'Média'}
                      </Badge>
                      <span className="text-sm">{rec.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report History */}
      {reports.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Relatórios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reports.slice(1).map((report) => (
                <div 
                  key={report.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(report.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">Score: {report.overall_score}%</Badge>
                    <Button variant="ghost" size="sm">Ver</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!latestReport && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="font-medium mt-4">Nenhum relatório ainda</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Execute sua primeira auditoria para ver o status do SEO do seu site.
            </p>
            <Button 
              onClick={() => runAudit.mutate()}
              disabled={runAudit.isPending}
              className="mt-4"
            >
              Executar Primeira Auditoria
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
