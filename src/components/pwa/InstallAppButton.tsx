/**
 * InstallAppButton - PWA install prompt button (white-label)
 * 
 * Behavior:
 * - Android/Chrome: shows "Instalar App" button that triggers native prompt
 * - iOS/Safari: shows "Como instalar" button with step-by-step modal
 * - Already installed or unsupported: hides or shows link to app domain
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
import { Download, Share, Plus, Smartphone, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface InstallAppButtonProps {
  partnerId?: string | null;
  partnerName?: string;
  appDomain?: string | null;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  /** If true, shows only when on the app domain (not marketing) */
  appDomainOnly?: boolean;
}

export function InstallAppButton({
  partnerId,
  partnerName = 'o aplicativo',
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
    showIOSInstructions,
    promptInstall,
    toggleIOSInstructions,
  } = usePWAInstall(partnerId);

  const [showDialog, setShowDialog] = useState(false);

  // If already installed in standalone mode, don't show
  if (isInstalled) return null;

  // On the marketing domain, if appDomain exists, link to it
  const isOnAppDomain = appDomain
    ? window.location.hostname === appDomain
    : true; // If no appDomain configured, assume we're on app

  // If appDomainOnly and we're NOT on the app domain, show link instead
  if (appDomainOnly && !isOnAppDomain) return null;

  // If we're on marketing domain and there's an app domain, show redirect link
  if (!isOnAppDomain && appDomain) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        asChild
      >
        <a href={`https://${appDomain}`} target="_blank" rel="noopener noreferrer">
          <Smartphone className="h-4 w-4 mr-2" />
          Baixar App
          <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </Button>
    );
  }

  // iOS: show instructions modal
  if (isIOS) {
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
                Adicione o app à tela inicial do seu iPhone/iPad
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium">Toque no botão Compartilhar</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No Safari, toque no ícone <Share className="inline h-4 w-4" /> na barra inferior
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium">Selecione "Adicionar à Tela de Início"</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Role a lista e toque em <Plus className="inline h-4 w-4" /> Adicionar à Tela de Início
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium">Confirme tocando "Adicionar"</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    O app aparecerá na sua tela inicial como um ícone
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Android/Chrome: native install prompt
  if (isInstallable) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={promptInstall}
      >
        <Download className="h-4 w-4 mr-2" />
        Instalar App
      </Button>
    );
  }

  // Desktop or no prompt available: show link to app domain if on marketing
  if (!isOnAppDomain && appDomain) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        asChild
      >
        <a href={`https://${appDomain}`} target="_blank" rel="noopener noreferrer">
          <Smartphone className="h-4 w-4 mr-2" />
          Acessar App
          <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </Button>
    );
  }

  // On app domain but no prompt (desktop/unsupported): show iOS-like instructions for mobile
  if (platform === 'android' || platform === 'ios') {
    return (
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
    );
  }

  // Desktop: don't show install button
  return null;
}
