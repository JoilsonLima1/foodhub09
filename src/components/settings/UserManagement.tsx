import { useState } from 'react';
import { useUserManagement, TenantUser } from '@/hooks/useUserManagement';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Shield, 
  UserCheck, 
  UserX,
  Loader2,
  Users,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppRole } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  cashier: 'Caixa',
  kitchen: 'Cozinha',
  stock: 'Estoque',
  delivery: 'Entregador',
  super_admin: 'Super Admin',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  cashier: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  kitchen: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  stock: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  delivery: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  super_admin: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
};

const ASSIGNABLE_ROLES: AppRole[] = ['admin', 'manager', 'cashier', 'kitchen', 'stock', 'delivery'];

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const { 
    users, 
    isLoading, 
    isCreating, 
    isUpdating,
    canManageUsers,
    createUser, 
    updateUser, 
    deleteUser,
    toggleUserStatus,
  } = useUserManagement();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    roles: [] as AppRole[],
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    roles: [] as AppRole[],
  });

  const handleCreateSubmit = async () => {
    const success = await createUser({
      email: createForm.email,
      password: createForm.password,
      full_name: createForm.full_name,
      phone: createForm.phone || undefined,
      roles: createForm.roles,
    });

    if (success) {
      setShowCreateDialog(false);
      setCreateForm({ email: '', password: '', full_name: '', phone: '', roles: [] });
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;

    const success = await updateUser(selectedUser.user_id, {
      full_name: editForm.full_name,
      phone: editForm.phone || undefined,
      roles: editForm.roles,
    });

    if (success) {
      setShowEditDialog(false);
      setSelectedUser(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    const success = await deleteUser(selectedUser.user_id);

    if (success) {
      setShowDeleteDialog(false);
      setSelectedUser(null);
    }
  };

  const openEditDialog = (user: TenantUser) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name,
      phone: user.phone || '',
      roles: user.roles.filter(r => r !== 'super_admin'),
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: TenantUser) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const toggleRole = (role: AppRole, form: 'create' | 'edit') => {
    if (form === 'create') {
      setCreateForm(prev => ({
        ...prev,
        roles: prev.roles.includes(role)
          ? prev.roles.filter(r => r !== role)
          : [...prev.roles, role],
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        roles: prev.roles.includes(role)
          ? prev.roles.filter(r => r !== role)
          : [...prev.roles, role],
      }));
    }
  };

  if (!canManageUsers) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Apenas administradores e gerentes podem gerenciar usuários.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerenciamento de Usuários
            </CardTitle>
            <CardDescription>
              Adicione, edite e gerencie permissões dos usuários do sistema
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Clique no botão acima para adicionar o primeiro usuário.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.full_name}</div>
                      {user.phone && (
                        <div className="text-sm text-muted-foreground">{user.phone}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map(role => (
                          <Badge 
                            key={role} 
                            variant="secondary"
                            className={ROLE_COLORS[role]}
                          >
                            {ROLE_LABELS[role]}
                          </Badge>
                        ))}
                        {user.roles.length === 0 && (
                          <span className="text-sm text-muted-foreground">Sem permissões</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={(checked) => toggleUserStatus(user.user_id, checked)}
                          disabled={user.user_id === currentUser?.id}
                        />
                        <span className={user.is_active ? 'text-green-600' : 'text-muted-foreground'}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toggleUserStatus(user.user_id, !user.is_active)}
                            disabled={user.user_id === currentUser?.id}
                          >
                            {user.is_active ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(user)}
                            className="text-destructive"
                            disabled={user.user_id === currentUser?.id}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo usuário no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome Completo *</Label>
              <Input
                id="create-name"
                value={createForm.full_name}
                onChange={e => setCreateForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Senha *</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">Telefone</Label>
              <Input
                id="create-phone"
                value={createForm.phone}
                onChange={e => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="grid grid-cols-2 gap-2">
                {ASSIGNABLE_ROLES.map(role => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`create-role-${role}`}
                      checked={createForm.roles.includes(role)}
                      onCheckedChange={() => toggleRole(role, 'create')}
                    />
                    <Label 
                      htmlFor={`create-role-${role}`} 
                      className="text-sm font-normal cursor-pointer"
                    >
                      {ROLE_LABELS[role]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateSubmit}
              disabled={isCreating || !createForm.email || !createForm.password || !createForm.full_name}
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere os dados e permissões do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="grid grid-cols-2 gap-2">
                {ASSIGNABLE_ROLES.map(role => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-role-${role}`}
                      checked={editForm.roles.includes(role)}
                      onCheckedChange={() => toggleRole(role, 'edit')}
                    />
                    <Label 
                      htmlFor={`edit-role-${role}`} 
                      className="text-sm font-normal cursor-pointer"
                    >
                      {ROLE_LABELS[role]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditSubmit}
              disabled={isUpdating || !editForm.full_name}
            >
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{selectedUser?.full_name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
