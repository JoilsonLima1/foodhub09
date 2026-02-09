/**
 * InstallAppButton - PWA install prompt button (white-label)
 * 
 * Behavior:
 * - Android/Chrome: shows "Instalar App" button that triggers native prompt
 * - iOS/Safari: shows "Como instalar" button with step-by-step modal
 * - If no native prompt: shows fallback "Como instalar" UI
 * - Marketing domain: links to partner app domain (or fallback with ?partner=slug)
 * - Already installed in standalone: hides completely
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Share, Plus, Smartphone, ExternalLink, Info } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface InstallAppButtonProps {
  partnerId?: string | null;
  partnerName?: string;
  partnerSlug?: string | null;
  appDomain?: string | null;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  /** If true, shows only when on the app domain (not marketing) */
  appDomainOnly?: boolean;
}

function getAppUrl(appDomain?: string | null, partnerSlug?: string | null): string {
  if (appDomain) return `https://${appDomain}`;
  // Fallback: platform app with partner query param
  if (partnerSlug) return `${window.location.origin}/?partner=${encodeURIComponent(partnerSlug)}`;
  return '/';
}

export function InstallAppButton({
  partnerId,
  partnerName = 'o aplicativo',
  partnerSlug,
  appDomain,
  variant = 'default',
  size = 'default',
  className = '',
  appDomainOnly = false,
}: InstallAppButtonProps) {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    platform,
    promptInstall,
    toggleIOSInstructions,
  } = usePWAInstall(partnerId);

  const [showDialog, setShowDialog] = useState(false);

  // If already installed in standalone mode, don't show
  if (isInstalled) return null;

  // On the marketing domain, if appDomain exists, link to it
  const isOnAppDomain = appDomain
    ? window.location.hostname === appDomain
    : true;

  if (appDomainOnly && !isOnAppDomain) return null;

  // Marketing domain: show link to app domain
  if (!isOnAppDomain) {
    const appUrl = getAppUrl(appDomain, partnerSlug);
    return (
      <Button variant={variant} size={size} className={className} asChild>
        <a href={appUrl} target="_blank" rel="noopener noreferrer">
          <Smartphone className="h-4 w-4 mr-2" />
          Baixar App
          <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </Button>
    );
  }

  // --- On App Domain ---

  // Android/Chrome: native install prompt available
  if (isInstallable) {
    return (
      <Button variant={variant} size={size} className={className} onClick={promptInstall}>
        <Download className="h-4 w-4 mr-2" />
        Instalar App
      </Button>
    );
  }

  // For all platforms (mobile + desktop): show instructions dialog
  const isIOSDevice = isIOS;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          setShowDialog(true);
          toggleIOSInstructions(true);
        }}
      >
        <Download className="h-4 w-4 mr-2" />
        Instalar App
      </Button>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) toggleIOSInstructions(false);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instalar {partnerName}</DialogTitle>
            <DialogDescription>
              {isIOSDevice
                ? 'Adicione o app à tela inicial do seu iPhone/iPad'
                : platform === 'desktop'
                ? 'Acesse pelo celular para instalar o app'
                : 'Adicione o app à tela inicial do seu celular'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {platform === 'desktop' ? (
              <>
                <InstallStep
                  step={1}
                  title="Abra no celular"
                  description={<>Acesse <strong>{window.location.hostname}</strong> no navegador do seu celular</>}
                />
                <InstallStep
                  step={2}
                  title="Instale o app"
                  description="No Android, toque em 'Instalar'. No iPhone, use Compartilhar → Adicionar à Tela de Início."
                />
                <InstallStep
                  step={3}
                  title="Pronto!"
                  description="O app aparecerá na sua tela inicial como um ícone"
                />
              </>
            ) : isIOSDevice ? (
              <>
                <InstallStep
                  step={1}
                  title="Toque no botão Compartilhar"
                  description={<>No Safari, toque no ícone <Share className="inline h-4 w-4" /> na barra inferior</>}
                />
                <InstallStep
                  step={2}
                  title='Selecione "Adicionar à Tela de Início"'
                  description={<>Role a lista e toque em <Plus className="inline h-4 w-4" /> Adicionar à Tela de Início</>}
                />
                <InstallStep
                  step={3}
                  title='Confirme tocando "Adicionar"'
                  description="O app aparecerá na sua tela inicial como um ícone"
                />
              </>
            ) : (
              <>
                <InstallStep
                  step={1}
                  title="Abra o menu do navegador"
                  description="Toque nos três pontos (⋮) no canto superior direito do Chrome"
                />
                <InstallStep
                  step={2}
                  title='Toque em "Instalar aplicativo"'
                  description='Ou "Adicionar à tela inicial" dependendo do navegador'
                />
                <InstallStep
                  step={3}
                  title="Confirme a instalação"
                  description="O app aparecerá na sua tela inicial como um ícone"
                />
              </>
            )}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                O app funciona offline e recebe atualizações automáticas. Nenhum download da loja de apps é necessário.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InstallStep({ step, title, description }: { step: number; title: string; description: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
        {step}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}
