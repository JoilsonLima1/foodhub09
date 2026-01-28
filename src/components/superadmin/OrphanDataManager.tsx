import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, RefreshCw, Trash2, UserX, FileX, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOrphanData, OrphanUser, OrphanProfile } from '@/hooks/useOrphanData';
import { PasswordConfirmDialog } from './PasswordConfirmDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function OrphanDataManager() {
  const {
    orphanUsers,
    orphanProfiles,
    isLoading,
    isDeleting,
    fetchOrphanData,
    deleteOrphanUser,
    deleteOrphanProfile,
    deleteAllOrphanUsers,
  } = useOrphanData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<OrphanUser | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<OrphanProfile | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  useEffect(() => {
    fetchOrphanData();
  }, [fetchOrphanData]);

  const filteredUsers = orphanUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProfiles = orphanProfiles.filter(profile =>
    profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteUser = async (password: string) => {
    if (selectedUser) {
      await deleteOrphanUser(selectedUser.id, password);
      setSelectedUser(null);
    }
  };

  const handleDeleteProfile = async (password: string) => {
    if (selectedProfile) {
      await deleteOrphanProfile(selectedProfile.id, password);
      setSelectedProfile(null);
    }
  };

  const handleDeleteAllUsers = async (password: string) => {
    await deleteAllOrphanUsers(password);
    setShowDeleteAllDialog(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Limpeza de Dados Órfãos
              </CardTitle>
              <CardDescription>
                Gerencie usuários e perfis que ficaram órfãos após exclusão de organizações
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOrphanData()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Usuários órfãos são contas de autenticação sem perfil ou organização associada. 
              Perfis órfãos são registros de perfil sem organização vinculada. Ambos podem impedir novos cadastros 
              com o mesmo e-mail.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{orphanUsers.length}</p>
                    <p className="text-sm text-muted-foreground">Usuários Órfãos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <FileX className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{orphanProfiles.length}</p>
                    <p className="text-sm text-muted-foreground">Perfis Órfãos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Orphan Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-500" />
              Usuários Órfãos (Auth)
            </CardTitle>
            {orphanUsers.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteAllDialog(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Todos
              </Button>
            )}
          </div>
          <CardDescription>
            Usuários no sistema de autenticação sem perfil ou organização associada
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum usuário órfão encontrado com esse termo' : 'Nenhum usuário órfão encontrado'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!user.has_profile && (
                          <Badge variant="destructive" className="text-xs">
                            Sem Perfil
                          </Badge>
                        )}
                        {!user.has_roles && (
                          <Badge variant="secondary" className="text-xs">
                            Sem Roles
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                        disabled={isDeleting}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Orphan Profiles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5 text-orange-500" />
            Perfis Órfãos (Sem Organização)
          </CardTitle>
          <CardDescription>
            Perfis existentes sem organização associada (tenant_id = null)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum perfil órfão encontrado com esse termo' : 'Nenhum perfil órfão encontrado'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.full_name}</TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>
                      {format(new Date(profile.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProfile(profile)}
                        disabled={isDeleting}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Single User Dialog */}
      <PasswordConfirmDialog
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        onConfirm={handleDeleteUser}
        title="Excluir Usuário Órfão"
        description={`Você está prestes a excluir permanentemente o usuário "${selectedUser?.email}". Esta ação não pode ser desfeita.`}
        isLoading={isDeleting}
        externalVerification
      />

      {/* Delete Single Profile Dialog */}
      <PasswordConfirmDialog
        open={!!selectedProfile}
        onOpenChange={(open) => !open && setSelectedProfile(null)}
        onConfirm={handleDeleteProfile}
        title="Excluir Perfil Órfão"
        description={`Você está prestes a excluir permanentemente o perfil "${selectedProfile?.full_name}" (${selectedProfile?.email}). Esta ação não pode ser desfeita.`}
        isLoading={isDeleting}
        externalVerification
      />

      {/* Delete All Users Dialog */}
      <PasswordConfirmDialog
        open={showDeleteAllDialog}
        onOpenChange={setShowDeleteAllDialog}
        onConfirm={handleDeleteAllUsers}
        title="Excluir Todos os Usuários Órfãos"
        description={`Você está prestes a excluir permanentemente ${orphanUsers.length} usuários órfãos. Esta ação não pode ser desfeita.`}
        isLoading={isDeleting}
        externalVerification
      />
    </div>
  );
}
