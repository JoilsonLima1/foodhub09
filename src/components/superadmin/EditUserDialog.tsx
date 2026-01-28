import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Save } from "lucide-react";
import type { SuperAdminUser } from "@/hooks/useSuperAdminUsers";
import { PasswordConfirmDialog } from "./PasswordConfirmDialog";

const ALL_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gerente" },
  { value: "cashier", label: "Caixa" },
  { value: "kitchen", label: "Cozinha" },
  { value: "delivery", label: "Entregador" },
  { value: "stock", label: "Estoque" },
];

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SuperAdminUser | null;
  onSave: (data: { full_name: string; phone: string; roles: string[] }) => Promise<void>;
  isLoading?: boolean;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSave,
  isLoading = false,
}: EditUserDialogProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone || "");
      setSelectedRoles(user.roles);
    }
  }, [user]);

  const handleRoleToggle = (role: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles((prev) => [...prev, role]);
    } else {
      setSelectedRoles((prev) => prev.filter((r) => r !== role));
    }
  };

  const handleSubmit = () => {
    setConfirmDialogOpen(true);
  };

  const executeSave = async () => {
    await onSave({
      full_name: fullName,
      phone,
      roles: selectedRoles,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setFullName("");
    setPhone("");
    setSelectedRoles([]);
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Editando: {user.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Nome Completo</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome completo..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                {ALL_ROLES.map((role) => (
                  <div key={role.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={(checked) =>
                        handleRoleToggle(role.value, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`role-${role.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!fullName.trim() || isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={executeSave}
        title="Confirmar Alterações"
        description="Digite sua senha para confirmar as alterações no usuário."
        confirmLabel="Confirmar"
        isLoading={isLoading}
      />
    </>
  );
}
