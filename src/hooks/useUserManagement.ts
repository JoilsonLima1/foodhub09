import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export interface TenantUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  roles: AppRole[];
  created_at: string;
}

interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  roles: AppRole[];
}

interface UpdateUserData {
  full_name?: string;
  phone?: string;
  is_active?: boolean;
  roles?: AppRole[];
}

export function useUserManagement() {
  const { tenantId, hasRole } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const canManageUsers = hasRole('admin') || hasRole('manager') || hasRole('super_admin');

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!tenantId || !canManageUsers) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch profiles for this tenant
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, phone, avatar_url, is_active, created_at')
        .eq('tenant_id', tenantId);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        return;
      }

      // Get user IDs
      const userIds = profiles.map(p => p.user_id);

      // Fetch roles for these users
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('tenant_id', tenantId)
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Group roles by user
      const rolesByUser: Record<string, AppRole[]> = {};
      userRoles?.forEach(ur => {
        if (!rolesByUser[ur.user_id]) {
          rolesByUser[ur.user_id] = [];
        }
        rolesByUser[ur.user_id].push(ur.role as AppRole);
      });

      // Combine data - we don't have direct access to auth.users email
      // We'll use edge function to get emails
      const authHeaders = await getAuthHeaders();
      if (!authHeaders) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }
      const { data: emailsData, error: emailsError } = await supabase.functions.invoke('manage-users', {
        body: { action: 'get-emails', userIds },
        headers: authHeaders,
      });

      if (emailsError) throw emailsError;

      const emailsByUser: Record<string, string> = emailsData?.emails || {};

      const combinedUsers: TenantUser[] = profiles.map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        email: emailsByUser[profile.user_id] || 'Email não disponível',
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        is_active: profile.is_active ?? true,
        roles: rolesByUser[profile.user_id] || [],
        created_at: profile.created_at,
      }));

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, canManageUsers, getAuthHeaders]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (data: CreateUserData) => {
    if (!tenantId || !canManageUsers) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para criar usuários',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsCreating(true);

      console.log('[useUserManagement] Creating user:', { tenantId, email: data.email });

      const authHeaders = await getAuthHeaders();
      if (!authHeaders) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      const response = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          tenantId,
          userData: data,
        },
        headers: authHeaders,
      });

      console.log('[useUserManagement] Create response:', response);

      if (response.error) {
        console.error('[useUserManagement] Function error:', response.error);
        throw response.error;
      }
      
      if (response.data?.error) {
        console.error('[useUserManagement] Data error:', response.data.error);
        throw new Error(response.data.error);
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário criado com sucesso',
      });

      await fetchUsers();
      return true;
    } catch (error: any) {
      console.error('[useUserManagement] Error creating user:', error);
      const errorMessage = error?.message || error?.error || 'Ocorreu um erro ao criar o usuário';
      toast({
        title: 'Erro ao criar usuário',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const updateUser = async (userId: string, data: UpdateUserData) => {
    if (!tenantId || !canManageUsers) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para editar usuários',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsUpdating(true);

      console.log('[useUserManagement] Updating user:', { userId, data });

      // Update profile if needed
      if (data.full_name || data.phone !== undefined || data.is_active !== undefined) {
        const updateData: Record<string, any> = {};
        if (data.full_name) updateData.full_name = data.full_name;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.is_active !== undefined) updateData.is_active = data.is_active;

        console.log('[useUserManagement] Updating profile:', updateData);

        const { error: profileError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', userId)
          .eq('tenant_id', tenantId);

        if (profileError) {
          console.error('[useUserManagement] Profile update error:', profileError);
          throw profileError;
        }
      }

      // Update roles if provided
      if (data.roles) {
        console.log('[useUserManagement] Updating roles:', data.roles);

        const authHeaders = await getAuthHeaders();
        if (!authHeaders) {
          throw new Error('Sessão não encontrada. Faça login novamente.');
        }
        
        const response = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'update-roles',
            tenantId,
            userId,
            roles: data.roles,
          },
          headers: authHeaders,
        });

        console.log('[useUserManagement] Roles update response:', response);

        if (response.error) {
          console.error('[useUserManagement] Roles function error:', response.error);
          throw response.error;
        }
        if (response.data?.error) {
          console.error('[useUserManagement] Roles data error:', response.data.error);
          throw new Error(response.data.error);
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso',
      });

      await fetchUsers();
      return true;
    } catch (error: any) {
      console.error('[useUserManagement] Error updating user:', error);
      const errorMessage = error?.message || error?.error || 'Ocorreu um erro ao atualizar o usuário';
      toast({
        title: 'Erro ao atualizar usuário',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!tenantId || !canManageUsers) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para excluir usuários',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      const { data: result, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'delete',
          tenantId,
          userId,
        },
        headers: authHeaders,
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso',
      });

      await fetchUsers();
      return true;
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message || 'Ocorreu um erro ao excluir o usuário',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    return updateUser(userId, { is_active: isActive });
  };

  return {
    users,
    isLoading,
    isCreating,
    isUpdating,
    canManageUsers,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
  };
}
