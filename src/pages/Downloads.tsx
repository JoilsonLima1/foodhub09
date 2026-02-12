import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Printer, Download, Monitor, Shield, CheckCircle,
  Settings, FileText, HelpCircle, ChevronRight, Cpu, Globe, ArrowLeft, Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDesktopPdvSettings } from '@/hooks/useDesktopPdvSettings';

const FEATURES = [
  { icon: Printer, title: 'Impressão 1 clique', desc: 'Imprime direto na térmica sem diálogo do navegador.' },
  { icon: Shield, title: 'Conexão nativa', desc: 'Comunicação direta via Electron. Sem serviços HTTP locais.' },
  { icon: Settings, title: 'Auto-detecta impressoras', desc: 'Reconhece modelos Epson, Elgin, Bematech, Daruma e genéricas ESC/POS.' },
  { icon: Cpu, title: 'Leve e integrado', desc: 'Roda como app desktop completo com atualização automática.' },
];

const STEPS = [
  { step: 1, title: 'Baixe e instale', desc: 'Execute o instalador e siga as instruções. O app abre automaticamente.' },
  { step: 2, title: 'Faça login', desc: 'Use suas credenciais do FoodHub para entrar no Desktop PDV.' },
  { step: 3, title: 'Pronto!', desc: 'Ao finalizar um pedido, o cupom sai direto na impressora sem diálogo.' },
];

const FAQ = [
  {
    q: 'Preciso instalar o Desktop PDV para imprimir?',
    a: 'Não. O modo Navegador já funciona com qualquer impressora. O Desktop PDV é para quem quer impressão 1-clique sem diálogo.',
  },
  {
    q: 'O Desktop PDV funciona em Linux?',
    a: 'Ainda não. Atualmente suportamos Windows 10+ e macOS 12+.',
  },
  {
    q: 'E se eu abrir pelo navegador ao invés do app?',
    a: 'O sistema detecta automaticamente e usa a impressão pelo navegador como fallback.',
  },
  {
    q: 'Como desinstalar?',
    a: 'No Windows: Painel de Controle → Programas → Desinstalar "FoodHub PDV Desktop". No macOS: mova o app para a Lixeira.',
  },
];

export default function Downloads() {
  const navigate = useNavigate();
  const { data: desktopUrls, isLoading } = useDesktopPdvSettings();

  const hasWindowsUrl = desktopUrls.windows_url && desktopUrls.windows_url !== '#';
  const hasMacUrl = desktopUrls.mac_url && desktopUrls.mac_url !== '#';

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl space-y-6">
      {/* Back nav */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      {/* Hero */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
          <Monitor className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">FoodHub PDV Desktop</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          App desktop para impressão 1-clique em impressoras térmicas. Sem diálogo, sem atraso.
        </p>
      </div>

      {/* Status Banner */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="flex items-start gap-3 py-4">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">Disponível</span>
              <Badge variant="outline" className="text-[10px] h-5 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                v1.0.0
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              O FoodHub PDV Desktop está pronto para uso. Baixe, instale e imprima em 1 clique.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Download Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" /> Download
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-1.5"
                disabled={!hasWindowsUrl}
                onClick={() => hasWindowsUrl && window.open(desktopUrls.windows_url, '_blank')}
              >
                <Monitor className="h-6 w-6" />
                <span className="font-medium">Windows</span>
                <span className="text-[10px] text-muted-foreground">
                  Windows 10+ • 64-bit • {hasWindowsUrl ? 'Baixar agora' : 'Em breve'}
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-1.5"
                disabled={!hasMacUrl}
                onClick={() => hasMacUrl && window.open(desktopUrls.mac_url, '_blank')}
              >
                <Globe className="h-6 w-6" />
                <span className="font-medium">macOS</span>
                <span className="text-[10px] text-muted-foreground">
                  macOS 12+ • Intel/Apple Silicon • {hasMacUrl ? 'Baixar agora' : 'Em breve'}
                </span>
              </Button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground text-center">
            Versão 1.0.0 • Nenhuma conta adicional é necessária.
          </p>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como funciona</CardTitle>
          <CardDescription>O Desktop PDV integra o FoodHub diretamente com suas impressoras térmicas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <f.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Setup Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instalação em 3 passos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {STEPS.map((s, i) => (
              <div key={s.step} className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                  {s.step}
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> Perguntas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {FAQ.map((item, i) => (
            <div key={i}>
              {i > 0 && <Separator className="my-3" />}
              <div>
                <p className="font-medium text-sm flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {item.q}
                </p>
                <p className="text-xs text-muted-foreground mt-1 pl-6">{item.a}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground pb-4">
        Precisa de ajuda? Acesse Configurações → Impressora Térmica → Ajuda
      </p>
    </div>
  );
}
