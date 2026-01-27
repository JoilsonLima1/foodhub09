import { useState } from 'react';
import { useUserManagement, TenantUser } from '@/hooks/useUserManagement';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  Crown,
  Settings,
  ShoppingCart,
  ChefHat,
  Package,
  Truck,
  Sparkles,
  Eye,
  Edit3,
  Ban,
  CheckCircle2,
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

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: 'Acesso total ao sistema, pode gerenciar usuários, configurações e todos os recursos',
  manager: 'Gerencia equipe, operações, relatórios e pode configurar produtos/categorias',
  cashier: 'Opera o PDV, processa pagamentos e visualiza pedidos',
  kitchen: 'Visualiza e gerencia pedidos em preparo, atualiza status de produção',
  stock: 'Controle completo de estoque, insumos, receitas e fornecedores',
  delivery: 'Visualiza e gerencia entregas atribuídas, atualiza status de entrega',
  super_admin: 'Administração completa do SaaS, todos os tenants',
};

const ROLE_ICONS: Record<AppRole, typeof Crown> = {
  admin: Crown,
  manager: Settings,
  cashier: ShoppingCart,
  kitchen: ChefHat,
  stock: Package,
  delivery: Truck,
  super_admin: Sparkles,
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  manager: 'bg-primary/10 text-primary border-primary/20',
  cashier: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  kitchen: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  stock: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  delivery: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  super_admin: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
};

const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: [
    'Gerenciar usuários e permissões',
    'Configurações do sistema',
    'Acesso a relatórios completos',
    'Gerenciar produtos e categorias',
    'Visualizar logs de auditoria',
    'Configurar integrações',
  ],
  manager: [
    'Gerenciar produtos e categorias',
    'Visualizar relatórios de vendas',
    'Gerenciar metas de vendas',
    'Aprovar cancelamentos',
    'Visualizar dashboard completo',
  ],
  cashier: [
    'Operar PDV',
    'Processar pagamentos',
    'Visualizar pedidos',
    'Abertura/Fechamento de caixa',
    'Aplicar descontos (limitado)',
  ],
  kitchen: [
    'Visualizar pedidos em preparo',
    'Atualizar status de produção',
    'Marcar itens como prontos',
    'Visualizar ficha técnica',
  ],
  stock: [
    'Gerenciar ingredientes',
    'Registrar entradas de estoque',
    'Configurar receitas (BOM)',
    'Alertas de estoque baixo',
    'Gerenciar fornecedores',
  ],
  delivery: [
    'Visualizar entregas atribuídas',
    'Atualizar status de entrega',
    'Confirmar recebimento',
    'Visualizar endereços',
  ],
  super_admin: [
    'Gerenciar todos os tenants',
    'Configurar planos de assinatura',
    'Gerenciar gateways de pagamento',
    'Configurar branding global',
  ],
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
  const [showViewDialog, setShowViewDialog] = useState(false);
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

  const openViewDialog = (user: TenantUser) => {
    setSelectedUser(user);
    setShowViewDialog(true);
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
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="permissions">
                <Shield className="h-4 w-4 mr-2" />
                Permissões
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Clique no botão acima para adicionar o primeiro usuário.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
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
                              {user.roles.map(role => {
                                const Icon = ROLE_ICONS[role];
                                return (
                                  <Badge 
                                    key={role} 
                                    variant="outline"
                                    className={`${ROLE_COLORS[role]} flex items-center gap-1`}
                                    title={ROLE_DESCRIPTIONS[role]}
                                  >
                                    <Icon className="h-3 w-3" />
                                    {ROLE_LABELS[role]}
                                  </Badge>
                                );
                              })}
                              {user.roles.length === 0 && (
                                <span className="text-sm text-muted-foreground italic">Sem permissões</span>
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
                                <DropdownMenuItem onClick={() => openViewDialog(user)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => toggleUserStatus(user.user_id, !user.is_active)}
                                  disabled={user.user_id === currentUser?.id}
                                >
                                  {user.is_active ? (
                                    <>
                                      <Ban className="h-4 w-4 mr-2" />
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
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
                </div>
              )}
            </TabsContent>

            <TabsContent value="permissions">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ASSIGNABLE_ROLES.map(role => {
                  const Icon = ROLE_ICONS[role];
                  return (
                    <Card key={role} className="border-0 bg-[#1a1a1a] overflow-hidden">
                      {/* Barra colorida superior com nome do perfil */}
                      <div className={`px-4 py-3 ${ROLE_COLORS[role]}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <span className="font-semibold text-base">{ROLE_LABELS[role]}</span>
                        </div>
                      </div>
                      
                      {/* Conteúdo com fundo escuro uniforme */}
                      <CardHeader className="pb-2 pt-4">
                        <CardDescription className="text-sm font-medium text-foreground">
                          {ROLE_DESCRIPTIONS[role]}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {ROLE_PERMISSIONS[role].map((permission, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                              {permission}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-sm font-semibold text-foreground">
                            {users.filter(u => u.roles.includes(role)).length} usuário(s) com esta permissão
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md max-h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo usuário no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
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
                <div className="grid grid-cols-1 gap-2">
                  {ASSIGNABLE_ROLES.map(role => {
                    const isSelected = createForm.roles.includes(role);
                    const Icon = ROLE_ICONS[role];
                    return (
                      <div 
                        key={role} 
                        className={`flex items-center space-x-3 p-3 rounded-md border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-primary/20 border-primary ring-2 ring-primary/30' 
                            : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30'
                        }`}
                        onClick={() => toggleRole(role, 'create')}
                      >
                        <Checkbox
                          id={`create-role-${role}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleRole(role, 'create')}
                          className={isSelected ? 'border-primary data-[state=checked]:bg-primary' : ''}
                        />
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1">
                          <Label 
                            htmlFor={`create-role-${role}`} 
                            className={`text-sm font-medium cursor-pointer ${isSelected ? 'text-primary' : ''}`}
                          >
                            {ROLE_LABELS[role]}
                          </Label>
                          <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4 shrink-0">
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
        <DialogContent className="sm:max-w-md max-h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere os dados e permissões do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
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
                <div className="grid grid-cols-1 gap-2">
                  {ASSIGNABLE_ROLES.map(role => {
                    const isSelected = editForm.roles.includes(role);
                    const Icon = ROLE_ICONS[role];
                    return (
                      <div 
                        key={role} 
                        className={`flex items-center space-x-3 p-3 rounded-md border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-primary/20 border-primary ring-2 ring-primary/30' 
                            : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30'
                        }`}
                        onClick={() => toggleRole(role, 'edit')}
                      >
                        <Checkbox
                          id={`edit-role-${role}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleRole(role, 'edit')}
                          className={isSelected ? 'border-primary data-[state=checked]:bg-primary' : ''}
                        />
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1">
                          <Label 
                            htmlFor={`edit-role-${role}`} 
                            className={`text-sm font-medium cursor-pointer ${isSelected ? 'text-primary' : ''}`}
                          >
                            {ROLE_LABELS[role]}
                          </Label>
                          <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4 shrink-0">
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

      {/* View User Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Detalhes do Usuário
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* User Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedUser.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p className="text-sm font-medium">{selectedUser.phone || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${selectedUser.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      <span className="text-sm font-medium">
                        {selectedUser.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Cadastrado em</Label>
                    <p className="text-sm font-medium">
                      {new Date(selectedUser.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Permissões Atribuídas</Label>
                {selectedUser.roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhuma permissão atribuída</p>
                ) : (
                  <div className="space-y-2">
                    {selectedUser.roles.map(role => {
                      const Icon = ROLE_ICONS[role];
                      return (
                        <div key={role} className={`p-3 rounded-lg border ${ROLE_COLORS[role]}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="h-4 w-4" />
                            <span className="font-medium">{ROLE_LABELS[role]}</span>
                          </div>
                          <ul className="space-y-1 ml-6">
                            {ROLE_PERMISSIONS[role].slice(0, 3).map((perm, idx) => (
                              <li key={idx} className="text-xs flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {perm}
                              </li>
                            ))}
                            {ROLE_PERMISSIONS[role].length > 3 && (
                              <li className="text-xs text-muted-foreground">
                                +{ROLE_PERMISSIONS[role].length - 3} mais...
                              </li>
                            )}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setShowViewDialog(false);
              if (selectedUser) openEditDialog(selectedUser);
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
