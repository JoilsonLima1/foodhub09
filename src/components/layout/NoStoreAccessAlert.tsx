import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Building2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoStoreAccessAlertProps {
  userName?: string;
}

export function NoStoreAccessAlert({ userName }: NoStoreAccessAlertProps) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Alert variant="destructive" className="max-w-lg">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-lg">Sem Acesso às Lojas</AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p>
            {userName ? `Olá, ${userName}. ` : ''}
            Sua conta não possui acesso a nenhuma loja deste estabelecimento.
          </p>
          <p className="text-sm">
            Por favor, entre em contato com o administrador do sistema para que ele atribua 
            as lojas que você pode acessar.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Building2 className="h-4 w-4" />
            <span>Acesso por loja é necessário para operar o sistema</span>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
