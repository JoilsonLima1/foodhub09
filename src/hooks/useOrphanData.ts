import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface OrphanUser {
  id: string;
  email: string;
  created_at: string;
  has_profile: boolean;
  has_roles: boolean;
  tenant_name: string | null;
}

export interface OrphanProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export function useOrphanData() {
  const { hasRole } = useAuth();
  const [orphanUsers, setOrphanUsers] = useState<OrphanUser[]>([]);
  const [orphanProfiles, setOrphanProfiles] = useState<OrphanProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperAdmin = hasRole("super_admin");

  const fetchOrphanData = useCallback(async () => {
    if (!isSuperAdmin) {
      setOrphanUsers([]);
      setOrphanProfiles([]);
      return;
    }

    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-organizations", {
        body: { action: "list-orphans" },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setOrphanUsers(res.data?.orphanUsers || []);
      setOrphanProfiles(res.data?.orphanProfiles || []);
    } catch (error: any) {
      console.error("[useOrphanData] Error fetching:", error);
      toast({
        title: "Erro ao carregar dados órfãos",
        description: error?.message || "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin]);

  const deleteOrphanUser = async (userId: string, password: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para esta ação",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsDeleting(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-organizations", {
        body: { action: "delete-orphan-user", userId, password },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setOrphanUsers(prev => prev.filter(u => u.id !== userId));
      toast({ title: "Sucesso", description: "Usuário órfão excluído permanentemente" });
      return true;
    } catch (error: any) {
      console.error("[useOrphanData] Error deleting user:", error);
      toast({
        title: "Erro ao excluir usuário",
        description: error?.message || "Ocorreu um erro ao excluir",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteOrphanProfile = async (profileId: string, password: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para esta ação",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsDeleting(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-organizations", {
        body: { action: "delete-orphan-profile", profileId, password },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setOrphanProfiles(prev => prev.filter(p => p.id !== profileId));
      toast({ title: "Sucesso", description: "Perfil órfão excluído permanentemente" });
      return true;
    } catch (error: any) {
      console.error("[useOrphanData] Error deleting profile:", error);
      toast({
        title: "Erro ao excluir perfil",
        description: error?.message || "Ocorreu um erro ao excluir",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAllOrphanUsers = async (password: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para esta ação",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsDeleting(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-organizations", {
        body: { action: "delete-all-orphan-users", password },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setOrphanUsers([]);
      toast({ 
        title: "Sucesso", 
        description: `${res.data?.deletedCount || 0} usuários órfãos excluídos` 
      });
      return true;
    } catch (error: any) {
      console.error("[useOrphanData] Error deleting all users:", error);
      toast({
        title: "Erro ao excluir usuários",
        description: error?.message || "Ocorreu um erro ao excluir",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    orphanUsers,
    orphanProfiles,
    isLoading,
    isDeleting,
    isSuperAdmin,
    fetchOrphanData,
    deleteOrphanUser,
    deleteOrphanProfile,
    deleteAllOrphanUsers,
  };
}
