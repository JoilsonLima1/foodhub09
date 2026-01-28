import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/types/database";
import { toast } from "@/hooks/use-toast";

export interface SuperAdminUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  roles: AppRole[];
  created_at: string;
  tenant_id: string | null;
  tenant_name: string | null;
  organization_name: string | null;
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

export function useSuperAdminUsers() {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const isSuperAdmin = hasRole("super_admin");

  const fetchUsers = useCallback(async () => {
    if (!isSuperAdmin) {
      setIsLoading(false);
      setUsers([]);
      return;
    }

    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "list-all-users" },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setUsers((res.data?.users as SuperAdminUser[]) || []);
    } catch (error: any) {
      console.error("[useSuperAdminUsers] Error fetching users:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: error?.message || "Não foi possível carregar os usuários",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (userId: string, tenantId: string, data: UpdateUserData) => {
    if (!isSuperAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para editar usuários",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsUpdating(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      // Update profile fields
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
      console.error("[useSuperAdminUsers] Error updating user:", error);
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

  const resetPassword = async (userId: string, newPassword: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para resetar senhas",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsUpdating(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "reset-password", userId, newPassword },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: "Sucesso", description: "Senha resetada com sucesso" });
      return true;
    } catch (error: any) {
      console.error("[useSuperAdminUsers] Error resetting password:", error);
      toast({
        title: "Erro ao resetar senha",
        description: error?.message || "Ocorreu um erro ao resetar a senha",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleUserStatus = async (userId: string, tenantId: string, isActive: boolean) => {
    return updateUser(userId, tenantId, { is_active: isActive });
  };

  return {
    users,
    isLoading,
    isUpdating,
    isSuperAdmin,
    fetchUsers,
    updateUser,
    resetPassword,
    toggleUserStatus,
  };
}
