import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, CheckCircle } from 'lucide-react';
import { usePaymentTerms } from '@/hooks/usePaymentTerms';

export function PaymentTermsAcceptanceDialog() {
  const { activeTerms, acceptTerms, needsAcceptance } = usePaymentTerms();
  const [isOpen, setIsOpen] = useState(false);
  const [acceptedClauses, setAcceptedClauses] = useState<Record<string, boolean>>({});

  if (!activeTerms || !needsAcceptance) return null;

  const clauses = activeTerms.clauses || [];
  const allClausesAccepted = clauses.every((clause) => acceptedClauses[clause.id]);

  const handleClauseToggle = (clauseId: string, checked: boolean) => {
    setAcceptedClauses((prev) => ({ ...prev, [clauseId]: checked }));
  };

  const handleAccept = () => {
    acceptTerms.mutate(undefined, {
      onSuccess: () => {
        setIsOpen(false);
        setAcceptedClauses({});
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Ver e Aceitar Termos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {activeTerms.title}
          </DialogTitle>
          <DialogDescription>
            Versão {activeTerms.version} — Leia e aceite todas as cláusulas para continuar
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {/* Introduction */}
            <p className="text-muted-foreground">{activeTerms.content}</p>

            {/* Clauses */}
            <div className="space-y-4">
              {clauses.map((clause, index) => (
                <div key={clause.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={clause.id}
                      checked={acceptedClauses[clause.id] || false}
                      onCheckedChange={(checked) => 
                        handleClauseToggle(clause.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <label
                        htmlFor={clause.id}
                        className="font-medium cursor-pointer flex items-center gap-2"
                      >
                        {index + 1}. {clause.title}
                        {acceptedClauses[clause.id] && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {clause.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {Object.values(acceptedClauses).filter(Boolean).length} de {clauses.length} cláusulas aceitas
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!allClausesAccepted || acceptTerms.isPending}
            >
              {acceptTerms.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Aceitar Termos
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
