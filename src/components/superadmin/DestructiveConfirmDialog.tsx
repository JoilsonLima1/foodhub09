import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DestructiveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmWord?: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

/**
 * DestructiveConfirmDialog - Confirmation dialog requiring user to type a phrase
 * 
 * Used for dangerous operations like deleting SEO pages, disabling indexation, etc.
 * User must type the confirmation word (default: "EXCLUIR") to proceed.
 */
export function DestructiveConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmWord = 'EXCLUIR',
  confirmLabel = 'Confirmar Exclusão',
  isLoading = false,
}: DestructiveConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setInputValue('');
    }
  }, [open]);

  const isConfirmDisabled = inputValue !== confirmWord || isLoading;

  const handleConfirm = () => {
    if (inputValue === confirmWord) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setInputValue('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <Trash2 className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">
              Esta ação é irreversível. Digite <strong>{confirmWord}</strong> para confirmar.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-input">Confirmação</Label>
            <Input
              id="confirm-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              placeholder={`Digite ${confirmWord} para confirmar`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isConfirmDisabled) {
                  handleConfirm();
                }
              }}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {isLoading ? 'Processando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
