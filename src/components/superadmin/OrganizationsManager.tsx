import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, 
  MoreVertical, 
  Edit, 
  Power, 
  Trash2, 
  Users, 
  Search,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useOrganizations, Organization } from '@/hooks/useOrganizations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OrganizationsManager() {
  const {
    organizations,
    isLoading,
    isUpdating,
    isDeleting,
    updateOrganization,
    toggleOrganizationStatus,
    deleteOrganizationPermanently,
    stats,
  } = useOrganizations();

  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [editForm, setEditForm] = useState<Partial<Organization>>({});
  const [deletePassword, setDeletePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (org: Organization) => {
    setSelectedOrg(org);
    setEditForm({
      name: org.name,
      email: org.email || '',
      phone: org.phone || '',
      address: org.address || '',
      city: org.city || '',
      state: org.state || '',
      zip_code: org.zip_code || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedOrg) return;
    const success = await updateOrganization(selectedOrg.id, editForm);
    if (success) {
      setEditDialogOpen(false);
      setSelectedOrg(null);
      setEditForm({});
    }
  };

  const handleToggleStatus = async (org: Organization) => {
    await toggleOrganizationStatus(org.id);
  };

  const handleDeleteClick = (org: Organization) => {
    setSelectedOrg(org);
    setDeletePassword('');
    setShowPassword(false);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedOrg || !deletePassword) return;
    const success = await deleteOrganizationPermanently(selectedOrg.id, deletePassword);
    if (success) {
      setDeleteDialogOpen(false);
      setSelectedOrg(null);
      setDeletePassword('');
    }
  };

  const getStatusBadge = (org: Organization) => {
    if (!org.is_active) {
      return <Badge variant="destructive">Inativa</Badge>;
    }
    switch (org.subscription_status) {
      case 'active':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'trialing':
        return <Badge variant="secondary">Em teste</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Pagamento pendente</Badge>;
      case 'canceled':
        return <Badge variant="outline">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{org.subscription_status || 'Sem status'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organizações
              </CardTitle>
              <CardDescription>
                Gerencie todas as organizações cadastradas na plataforma
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Total:</span>
                <Badge variant="outline">{stats.total}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Ativas:</span>
                <Badge className="bg-green-500">{stats.active}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Usuários:</span>
                <Badge variant="secondary">{stats.totalUsers}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filteredOrgs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-2 opacity-50" />
              <p>Nenhuma organização encontrada</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organização</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="w-[70px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.map((org) => (
                    <TableRow key={org.id} className={!org.is_active ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{org.name}</span>
                          {org.slug && (
                            <span className="text-xs text-muted-foreground">/{org.slug}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          {org.email && <span>{org.email}</span>}
                          {org.phone && <span className="text-muted-foreground">{org.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{org.user_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(org)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(org.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(org)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(org)}>
                              <Power className="mr-2 h-4 w-4" />
                              {org.is_active ? 'Desativar' : 'Ativar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(org)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir permanentemente
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Organização</DialogTitle>
            <DialogDescription>
              Atualize as informações da organização {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={editForm.address || ''}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={editForm.city || ''}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={editForm.state || ''}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input
                  id="zip_code"
                  value={editForm.zip_code || ''}
                  onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir Organização Permanentemente
            </DialogTitle>
            <DialogDescription className="text-left">
              Esta ação é <strong>irreversível</strong>. Todos os dados da organização serão
              excluídos permanentemente, incluindo:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
              <li>Todos os usuários e perfis</li>
              <li>Produtos, categorias e estoque</li>
              <li>Pedidos e histórico de vendas</li>
              <li>Configurações e integrações</li>
            </ul>
            <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20 mb-4">
              <p className="text-sm font-medium">
                Organização: <span className="text-destructive">{selectedOrg?.name}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedOrg?.user_count} usuário(s) serão excluídos
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delete-password">Digite sua senha para confirmar</Label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={showPassword ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Sua senha"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting || !deletePassword}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
