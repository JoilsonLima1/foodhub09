import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Monitor, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface KioskHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain?: string;
}

export function KioskHelpModal({ open, onOpenChange, domain }: KioskHelpModalProps) {
  const { toast } = useToast();
  const appDomain = domain || window.location.origin;
  const shortcutCommand = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk --kiosk-printing ${appDomain}/pdv`;

  const copyCommand = () => {
    navigator.clipboard.writeText(shortcutCommand);
    toast({ title: 'Comando copiado!' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Impressão sem diálogo (igual iFood)
          </DialogTitle>
          <DialogDescription>
            Configure o Chrome para imprimir automaticamente sem abrir a janela de seleção de impressora.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2 text-sm">
          {/* Step 1 */}
          <div className="space-y-1.5">
            <h4 className="font-semibold text-foreground">Passo 1 — Definir impressora padrão</h4>
            <p className="text-muted-foreground">
              No Windows, vá em <strong>Configurações → Bluetooth e dispositivos → Impressoras e scanners</strong>.
              Selecione sua impressora térmica e clique em <strong>"Definir como padrão"</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-1.5">
            <h4 className="font-semibold text-foreground">Passo 2 — Desativar gerenciamento automático</h4>
            <p className="text-muted-foreground">
              Na mesma tela de Impressoras, desative a opção{' '}
              <strong>"Permitir que o Windows gerencie minha impressora padrão"</strong>.
              Isso garante que a impressora térmica será sempre a padrão.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-1.5">
            <h4 className="font-semibold text-foreground">Passo 3 — Criar atalho do Chrome</h4>
            <p className="text-muted-foreground">
              Crie um atalho na área de trabalho com o seguinte destino:
            </p>
            <div className="relative">
              <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {shortcutCommand}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 h-7 w-7 p-0"
                onClick={copyCommand}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>--kiosk</strong>: abre em tela cheia sem barra de endereço.{' '}
              <strong>--kiosk-printing</strong>: envia para impressora padrão sem diálogo.
            </p>
          </div>

          {/* Step 4 */}
          <div className="space-y-1.5">
            <h4 className="font-semibold text-foreground">Passo 4 — Usar sempre pelo atalho</h4>
            <p className="text-muted-foreground">
              Abra o PDV sempre por esse atalho. Se abrir pelo Chrome normal, o diálogo de impressão vai aparecer normalmente.
            </p>
          </div>

          {/* Warning */}
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <p className="font-medium">⚠️ Importante</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Feche todas as janelas do Chrome antes de abrir pelo atalho Kiosk.</li>
              <li>Para sair do modo Kiosk, pressione <strong>Alt+F4</strong>.</li>
              <li>Funciona apenas no <strong>Google Chrome</strong> para Windows/Linux.</li>
              <li>No macOS, use o Chromium com flags equivalentes.</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
