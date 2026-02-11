import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useLegalAcceptance } from '@/hooks/useLegalAcceptance';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  tenantId: string;
  open: boolean;
  onAccepted: () => void;
  onCancel: () => void;
}

export function LegalAcceptanceModal({ tenantId, open, onAccepted, onCancel }: Props) {
  const { requiredDocs, loading, acceptDocuments } = useLegalAcceptance(tenantId);
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());
  const [scrolledDocs, setScrolledDocs] = useState<Set<string>>(new Set());
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load current commission rate for display
  useEffect(() => {
    if (open) {
      supabase
        .from('pix_split_settings')
        .select('default_commission_percent')
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) setCommissionPercent((data as any).default_commission_percent);
        });
    }
  }, [open]);

  const pendingDocs = requiredDocs.filter(d => !d.accepted);
  const allChecked = pendingDocs.length > 0 && pendingDocs.every(d => checkedDocs.has(d.document.id));
  const allScrolled = pendingDocs.every(d => !d.document.requires_scroll || scrolledDocs.has(d.document.id));

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setCheckedDocs(new Set());
      setScrolledDocs(new Set());
      setExpandedDoc(null);
    }
  }, [open]);

  function handleCheckAll(checked: boolean) {
    if (checked) {
      setCheckedDocs(new Set(pendingDocs.map(d => d.document.id)));
    } else {
      setCheckedDocs(new Set());
    }
  }

  function handleCheckDoc(docId: string, checked: boolean) {
    const next = new Set(checkedDocs);
    if (checked) next.add(docId);
    else next.delete(docId);
    setCheckedDocs(next);
  }

  function handleScroll(docId: string, e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    if (atBottom) {
      setScrolledDocs(prev => new Set([...prev, docId]));
    }
  }

  async function handleAccept() {
    setSubmitting(true);
    const docIds = pendingDocs.map(d => d.document.id);
    const success = await acceptDocuments(docIds);

    if (success) {
      toast.success('Termos aceitos com sucesso!');
      onAccepted();
    } else {
      toast.error('Erro ao registrar aceite. Tente novamente.');
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <Dialog open={open}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (pendingDocs.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Aceite de Termos Obrigatório
          </DialogTitle>
          <DialogDescription>
            Para ativar o PIX com split automático, é necessário aceitar os termos abaixo.
            O aceite digital possui validade jurídica conforme o Marco Civil da Internet.
          </DialogDescription>
        </DialogHeader>

        {/* Split model summary */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Modelo de Retenção Automática
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A comissão será aplicada automaticamente via divisão (split) no momento da liquidação do Pix.
            O valor é dividido pela instituição de pagamento — a Plataforma não realiza custódia de valores.
          </p>
          {commissionPercent !== null && (
            <p className="text-xs font-medium text-primary">
              Comissão vigente: {commissionPercent}% por transação
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {pendingDocs.map((doc) => (
            <div key={doc.document.id} className="rounded-lg border">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                onClick={() => setExpandedDoc(
                  expandedDoc === doc.document.id ? null : doc.document.id
                )}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{doc.document.title}</p>
                    <p className="text-xs text-muted-foreground">Versão {doc.document.version}</p>
                  </div>
                </div>
                {scrolledDocs.has(doc.document.id) && (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>

              {expandedDoc === doc.document.id && (
                <>
                  <Separator />
                  <ScrollArea
                    className="h-64 p-4"
                    onScrollCapture={(e: any) => handleScroll(doc.document.id, e)}
                  >
                    <div
                      ref={scrollRef}
                      className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed"
                      onScroll={(e) => handleScroll(doc.document.id, e)}
                    >
                      {doc.document.content}
                    </div>
                  </ScrollArea>
                  {doc.document.requires_scroll && !scrolledDocs.has(doc.document.id) && (
                    <p className="text-xs text-destructive px-4 pb-2">
                      ⚠ Role até o final do documento para habilitar o aceite
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-3 pt-2">
          {/* Individual checkboxes */}
          {pendingDocs.map((doc) => (
            <div key={doc.document.id} className="flex items-center gap-2">
              <Checkbox
                id={`check-${doc.document.id}`}
                checked={checkedDocs.has(doc.document.id)}
                onCheckedChange={(v) => handleCheckDoc(doc.document.id, !!v)}
                disabled={doc.document.requires_scroll && !scrolledDocs.has(doc.document.id)}
              />
              <label htmlFor={`check-${doc.document.id}`} className="text-sm cursor-pointer">
                Aceito {doc.document.title}
              </label>
            </div>
          ))}

          <Separator />

          {/* Accept all checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="check-all"
              checked={allChecked}
              onCheckedChange={(v) => handleCheckAll(!!v)}
              disabled={!allScrolled}
            />
            <label htmlFor="check-all" className="text-sm font-medium cursor-pointer">
              Aceito todos os termos acima
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleAccept} disabled={!allChecked || submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Aceitar e Ativar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
