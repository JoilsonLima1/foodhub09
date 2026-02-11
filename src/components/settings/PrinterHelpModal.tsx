import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Zap, HelpCircle } from 'lucide-react';

interface PrinterHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrinterHelpModal({ open, onOpenChange }: PrinterHelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Como configurar impressão</DialogTitle>
          <DialogDescription>Guia passo a passo para cada modo</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browser" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="browser" className="flex-1 gap-1">
              <Monitor className="h-3.5 w-3.5" /> Web
            </TabsTrigger>
            <TabsTrigger value="agent" className="flex-1 gap-1">
              <Zap className="h-3.5 w-3.5" /> 1-Clique
            </TabsTrigger>
            <TabsTrigger value="troubleshooting" className="flex-1 gap-1">
              <HelpCircle className="h-3.5 w-3.5" /> Problemas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browser" className="space-y-3 text-sm mt-3">
            <h4 className="font-semibold">Impressão via Navegador (Padrão)</h4>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>Instale o driver da impressora térmica no Windows/macOS.</li>
              <li>Vá em <strong>Configurações do Windows → Impressoras</strong> e defina sua impressora térmica como padrão.</li>
              <li>No Chrome/Edge, ao abrir o diálogo de impressão pela primeira vez, selecione sua impressora térmica.</li>
              <li>Marque "Sempre usar esta impressora" se disponível.</li>
              <li>Selecione a largura do papel (58mm ou 80mm) correspondente à sua bobina.</li>
              <li>Use o botão "Imprimir Teste" para verificar alinhamento e corte.</li>
            </ol>
          </TabsContent>

          <TabsContent value="agent" className="space-y-3 text-sm mt-3">
            <h4 className="font-semibold">Impressão 1-Clique (FoodHub Print)</h4>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>Baixe o <strong>FoodHub Print Agent</strong> na página de downloads.</li>
              <li>Instale e execute o programa — ele roda em segundo plano.</li>
              <li>Na configuração, ative o modo "Impressão 1-clique".</li>
              <li>Clique em "Testar conexão" para verificar que o agente está funcionando.</li>
              <li>Pronto! Ao clicar em Imprimir, o cupom sai direto sem diálogo.</li>
            </ol>
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2.5 text-xs text-amber-700 dark:text-amber-300">
              <strong>Nota:</strong> O agente é opcional. Se estiver desligado, o sistema usa automaticamente a impressão pelo navegador.
            </div>
          </TabsContent>

          <TabsContent value="troubleshooting" className="space-y-3 text-sm mt-3">
            <h4 className="font-semibold">Problemas Comuns</h4>
            <div className="space-y-3 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Cupom sai com margens grandes</p>
                <p>Na janela de impressão, em "Mais configurações" → "Margens" → selecione "Nenhuma".</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Texto cortado ou desalinhado</p>
                <p>Verifique se a largura do papel configurada (58mm/80mm) corresponde à bobina instalada.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Impressora não corta o papel</p>
                <p>Nem todas as impressoras suportam corte automático. Confira no manual do modelo.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Driver Epson TM</p>
                <p>Baixe o driver APD (Advanced Printer Driver) do site da Epson. Selecione o modelo exato e configure como impressora padrão do Windows.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">58mm vs 80mm</p>
                <p>58mm ≈ 32 caracteres por linha, ideal para quiosques. 80mm ≈ 42 caracteres, padrão para restaurantes.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
