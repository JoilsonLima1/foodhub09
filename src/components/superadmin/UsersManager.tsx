import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Search,
  MoreVertical,
  Edit,
  KeyRound,
  UserCheck,
  UserX,
  RefreshCw,
  Building,
} from "lucide-react";
import { useSuperAdminUsers, type SuperAdminUser } from "@/hooks/useSuperAdminUsers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditUserDialog } from "./EditUserDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { PasswordConfirmDialog } from "./PasswordConfirmDialog";

const ROLE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  super_admin: { label: "Super Admin", variant: "destructive" },
  admin: { label: "Admin", variant: "default" },
  manager: { label: "Gerente", variant: "secondary" },
  cashier: { label: "Caixa", variant: "outline" },
  kitchen: { label: "Cozinha", variant: "outline" },
  delivery: { label: "Entregador", variant: "outline" },
  stock: { label: "Estoque", variant: "outline" },
};

export function UsersManager() {
  const {
    users,
    isLoading,
    isUpdating,
    fetchUsers,
    updateUser,
    resetPassword,
    toggleUserStatus,
  } = useSuperAdminUsers();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "activate" | "deactivate";
    user: SuperAdminUser;
  } | null>(null);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.organization_name?.toLowerCase().includes(term) ||
        user.tenant_name?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const handleEditUser = (user: SuperAdminUser) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleResetPassword = (user: SuperAdminUser) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleToggleStatus = (user: SuperAdminUser) => {
    setPendingAction({
      type: user.is_active ? "deactivate" : "activate",
      user,
    });
    setConfirmDialogOpen(true);
  };

  const executeToggleStatus = async () => {
    if (!pendingAction) return;
    const { user, type } = pendingAction;
    await toggleUserStatus(user.user_id, user.tenant_id || "", type === "activate");
    setPendingAction(null);
  };

  const handleSaveEdit = async (data: { full_name: string; phone: string; roles: string[] }) => {
    if (!selectedUser) return;
    const success = await updateUser(selectedUser.user_id, selectedUser.tenant_id || "", {
      full_name: data.full_name,
      phone: data.phone,
      roles: data.roles as any[],
    });
    if (success) {
      setEditDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleSavePassword = async (newPassword: string) => {
    if (!selectedUser) return;
    const success = await resetPassword(selectedUser.user_id, newPassword);
    if (success) {
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gerenciamento de Usuários
              </CardTitle>
              <CardDescription>
                Visualize e gerencie todos os usuários do sistema
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou organização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Total: {users.length}</span>
            <span>Ativos: {users.filter((u) => u.is_active).length}</span>
            <span>Inativos: {users.filter((u) => !u.is_active).length}</span>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className={!user.is_active ? "opacity-60" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.phone && (
                            <p className="text-xs text-muted-foreground">{user.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {user.organization_name || user.tenant_name || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => {
                              const config = ROLE_LABELS[role] || {
                                label: role,
                                variant: "outline" as const,
                              };
                              return (
                                <Badge key={role} variant={config.variant} className="text-xs">
                                  {config.label}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem permissões</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(new Date(user.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                              <KeyRound className="h-4 w-4 mr-2" />
                              Resetar Senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(user)}
                              className={user.is_active ? "text-destructive" : "text-green-600"}
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Inativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSave={handleSaveEdit}
        isLoading={isUpdating}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        user={selectedUser}
        onSave={handleSavePassword}
        isLoading={isUpdating}
      />

      {/* Password Confirm Dialog */}
      <PasswordConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={executeToggleStatus}
        title={
          pendingAction?.type === "deactivate"
            ? "Inativar Usuário"
            : "Ativar Usuário"
        }
        description={
          pendingAction?.type === "deactivate"
            ? `Tem certeza que deseja inativar o usuário "${pendingAction?.user.full_name}"? Ele não poderá mais acessar o sistema.`
            : `Tem certeza que deseja ativar o usuário "${pendingAction?.user.full_name}"? Ele poderá acessar o sistema novamente.`
        }
        confirmLabel={pendingAction?.type === "deactivate" ? "Inativar" : "Ativar"}
        isLoading={isUpdating}
      />
    </>
  );
}
