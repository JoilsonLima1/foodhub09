/**
 * PartnerUsers - Manage partner team users
 */

import { useState } from 'react';
import { usePartnerUsersData } from '@/hooks/usePartnerData';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Users, 
  MoreHorizontal, 
  Shield, 
  UserCog, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PartnerUsersPage() {
  const { partnerUser } = usePartnerContext();
  const { users, isLoading, updateUserRole, toggleUserActive, removeUser } = usePartnerUsersData();

  const handleRoleChange = (id: string, newRole: string) => {
    updateUserRole.mutate({ id, role: newRole });
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    toggleUserActive.mutate({ id, is_active: !currentActive });
  };

  const handleRemove = (id: string) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      removeUser.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários do Parceiro</h1>
          <p className="text-muted-foreground">
            Gerencie a equipe que tem acesso ao painel do parceiro
          </p>
        </div>
        {/* Future: Add user button */}
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium">Nenhum usuário encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione usuários à equipe do parceiro
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isCurrentUser = user.id === partnerUser?.id;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.profile?.full_name || 'Usuário'}
                              {isCurrentUser && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Você
                                </Badge>
                              )}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'partner_admin' ? 'default' : 'secondary'}>
                          {user.role === 'partner_admin' ? (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Administrador
                            </>
                          ) : (
                            <>
                              <UserCog className="h-3 w-3 mr-1" />
                              Suporte
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inativo
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.created_at 
                          ? format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {!isCurrentUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.role === 'partner_admin' ? (
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user.id, 'partner_support')}
                                >
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Mudar para Suporte
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user.id, 'partner_admin')}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Promover a Admin
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(user.id, user.is_active)}
                              >
                                {user.is_active ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Ativar
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRemove(user.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
