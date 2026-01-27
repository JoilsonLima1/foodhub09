import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/types/database";
import { toast } from "@/hooks/use-toast";

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

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export function useTenantUserManagement() {
  const { tenantId, hasRole } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isSuperAdmin = hasRole("super_admin");
  const canManageUsers = hasRole("admin") || hasRole("manager") || isSuperAdmin;

  const fetchUsers = useCallback(async () => {
    if (!canManageUsers) {
      setIsLoading(false);
      setUsers([]);
      return;
    }

    // Wait until AuthContext resolves tenantId
    if (!tenantId) {
      setIsLoading(true);
      return;
    }

    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "list-users", tenantId },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      let fetchedUsers = (res.data?.users as TenantUser[]) || [];
      
      // Non-super_admin users should NOT see super_admin users in the list
      if (!isSuperAdmin) {
        fetchedUsers = fetchedUsers.filter(
          (user) => !user.roles.includes("super_admin")
        );
      }

      setUsers(fetchedUsers);
    } catch (error: any) {
      console.error("[useTenantUserManagement] Error fetching users:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: error?.message || "Não foi possível carregar os usuários",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [canManageUsers, tenantId, isSuperAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (data: CreateUserData) => {
    if (!canManageUsers) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para criar usuários",
        variant: "destructive",
      });
      return false;
    }
    if (!tenantId) {
      toast({
        title: "Tenant não definido",
        description: "Aguarde o carregamento do seu perfil e tente novamente.",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsCreating(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "create", tenantId, userData: data },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: "Sucesso", description: "Usuário criado com sucesso" });
      await fetchUsers();
      return true;
    } catch (error: any) {
      console.error("[useTenantUserManagement] Error creating user:", error);
      toast({
        title: "Erro ao criar usuário",
        description: error?.message || "Ocorreu um erro ao criar o usuário",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const updateUser = async (userId: string, data: UpdateUserData) => {
    if (!canManageUsers) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para editar usuários",
        variant: "destructive",
      });
      return false;
    }
    if (!tenantId) {
      toast({
        title: "Tenant não definido",
        description: "Aguarde o carregamento do seu perfil e tente novamente.",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsUpdating(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      // Update profile fields through backend to avoid RLS limitations
      if (data.full_name !== undefined || data.phone !== undefined || data.is_active !== undefined) {
        const profileUpdate: Record<string, any> = {};
        if (data.full_name !== undefined) profileUpdate.full_name = data.full_name;
        if (data.phone !== undefined) profileUpdate.phone = data.phone;
        if (data.is_active !== undefined) profileUpdate.is_active = data.is_active;

        const resProfile = await supabase.functions.invoke("manage-users", {
          body: { action: "update-profile", tenantId, userId, profileData: profileUpdate },
          headers,
        });

        if (resProfile.error) throw resProfile.error;
        if (resProfile.data?.error) throw new Error(resProfile.data.error);
      }

      // Update roles if provided
      if (data.roles) {
        const resRoles = await supabase.functions.invoke("manage-users", {
          body: { action: "update-roles", tenantId, userId, roles: data.roles },
          headers,
        });

        if (resRoles.error) throw resRoles.error;
        if (resRoles.data?.error) throw new Error(resRoles.data.error);
      }

      toast({ title: "Sucesso", description: "Usuário atualizado com sucesso" });
      await fetchUsers();
      return true;
    } catch (error: any) {
      console.error("[useTenantUserManagement] Error updating user:", error);
      toast({
        title: "Erro ao atualizar usuário",
        description: error?.message || "Ocorreu um erro ao atualizar o usuário",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!canManageUsers) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para excluir usuários",
        variant: "destructive",
      });
      return false;
    }
    if (!tenantId) {
      toast({
        title: "Tenant não definido",
        description: "Aguarde o carregamento do seu perfil e tente novamente.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "delete", tenantId, userId },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: "Sucesso", description: "Usuário excluído com sucesso" });
      await fetchUsers();
      return true;
    } catch (error: any) {
      console.error("[useTenantUserManagement] Error deleting user:", error);
      toast({
        title: "Erro ao excluir usuário",
        description: error?.message || "Ocorreu um erro ao excluir o usuário",
        variant: "destructive",
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
    isSuperAdmin,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
  };
}
