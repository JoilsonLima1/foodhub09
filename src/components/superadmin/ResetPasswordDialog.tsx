import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, AlertTriangle } from "lucide-react";
import type { SuperAdminUser } from "@/hooks/useSuperAdminUsers";
import { PasswordConfirmDialog } from "./PasswordConfirmDialog";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SuperAdminUser | null;
  onSave: (newPassword: string) => Promise<void>;
  isLoading?: boolean;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onSave,
  isLoading = false,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const validatePassword = () => {
    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = () => {
    if (!validatePassword()) return;
    setConfirmDialogOpen(true);
  };

  const executeSave = async () => {
    await onSave(newPassword);
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Resetar Senha
            </DialogTitle>
            <DialogDescription>
              Resetando senha de: {user.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                O usuário precisará fazer login com a nova senha
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Digite a nova senha..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                placeholder="Confirme a nova senha..."
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!newPassword || !confirmPassword || isLoading}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Resetar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={executeSave}
        title="Confirmar Reset de Senha"
        description={`Digite sua senha para confirmar o reset de senha do usuário "${user.full_name}".`}
        confirmLabel="Confirmar Reset"
        isLoading={isLoading}
      />
    </>
  );
}
