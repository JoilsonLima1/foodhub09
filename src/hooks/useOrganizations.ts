import { useCallback, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  is_active: boolean;
  subscription_status: string | null;
  business_category: string | null;
  created_at: string;
  updated_at: string;
  user_count: number;
}

interface UpdateOrganizationData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  is_active?: boolean;
  subscription_status?: string;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export function useOrganizations() {
  const { hasRole } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperAdmin = hasRole("super_admin");

  const fetchOrganizations = useCallback(async () => {
    if (!isSuperAdmin) {
      setIsLoading(false);
      setOrganizations([]);
      return;
    }

    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-organizations", {
        body: { action: "list" },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setOrganizations((res.data?.organizations as Organization[]) || []);
    } catch (error: any) {
      console.error("[useOrganizations] Error fetching:", error);
      toast({
        title: "Erro ao carregar organizações",
        description: error?.message || "Não foi possível carregar as organizações",
        variant: "destructive",
      });
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const updateOrganization = async (organizationId: string, data: UpdateOrganizationData) => {
    if (!isSuperAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para editar organizações",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsUpdating(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-organizations", {
        body: { action: "update", organizationId, organizationData: data },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: "Sucesso", description: "Organização atualizada com sucesso" });
      await fetchOrganizations();
      return true;
    } catch (error: any) {
      console.error("[useOrganizations] Error updating:", error);
      toast({
        title: "Erro ao atualizar organização",
        description: error?.message || "Ocorreu um erro ao atualizar a organização",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleOrganizationStatus = async (organizationId: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para alterar status de organizações",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsUpdating(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-organizations", {
        body: { action: "toggle-status", organizationId },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      const newStatus = res.data.is_active ? "ativada" : "desativada";
      toast({ title: "Sucesso", description: `Organização ${newStatus} com sucesso` });
      await fetchOrganizations();
      return true;
    } catch (error: any) {
      console.error("[useOrganizations] Error toggling status:", error);
      toast({
        title: "Erro ao alterar status",
        description: error?.message || "Ocorreu um erro ao alterar o status",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteOrganizationPermanently = async (organizationId: string, password: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para excluir organizações",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsDeleting(true);
      const headers = await getAuthHeaders();
      if (!headers) throw new Error("Sessão não encontrada. Faça login novamente.");

      const res = await supabase.functions.invoke("manage-organizations", {
        body: { action: "delete-permanent", organizationId, password },
        headers,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: "Sucesso", description: "Organização excluída permanentemente" });
      await fetchOrganizations();
      return true;
    } catch (error: any) {
      console.error("[useOrganizations] Error deleting:", error);
      toast({
        title: "Erro ao excluir organização",
        description: error?.message || "Ocorreu um erro ao excluir a organização",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = {
    total: organizations.length,
    active: organizations.filter(o => o.is_active).length,
    inactive: organizations.filter(o => !o.is_active).length,
    totalUsers: organizations.reduce((acc, o) => acc + o.user_count, 0),
  };

  return {
    organizations,
    isLoading,
    isUpdating,
    isDeleting,
    isSuperAdmin,
    fetchOrganizations,
    updateOrganization,
    toggleOrganizationStatus,
    deleteOrganizationPermanently,
    stats,
  };
}
