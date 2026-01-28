import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type SuggestionStatus = 'pending' | 'read' | 'responded' | 'archived';
export type SuggestionType = 'improvement' | 'bug' | 'feature' | 'other';

export interface Suggestion {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  name: string;
  email: string;
  whatsapp: string | null;
  organization_name: string | null;
  subject: string;
  message: string;
  suggestion_type: SuggestionType;
  status: SuggestionStatus;
  admin_response: string | null;
  responded_at: string | null;
  responded_by: string | null;
  source: 'landing' | 'organization';
  created_at: string;
  updated_at: string;
}

export interface CreateSuggestionData {
  name: string;
  email: string;
  whatsapp?: string;
  organization_name?: string;
  subject: string;
  message: string;
  suggestion_type: SuggestionType;
  source: 'landing' | 'organization';
  tenant_id?: string;
  user_id?: string;
}

export function useSuggestions() {
  const { hasRole } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin = hasRole('super_admin');

  const fetchSuggestions = useCallback(async () => {
    if (!isSuperAdmin) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuggestions((data as unknown as Suggestion[]) || []);
    } catch (error: any) {
      console.error('[useSuggestions] Error fetching:', error);
      toast({
        title: 'Erro ao carregar sugestões',
        description: error?.message || 'Não foi possível carregar as sugestões',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSuggestions();
    }
  }, [fetchSuggestions, isSuperAdmin]);

  const submitSuggestion = async (data: CreateSuggestionData): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('suggestions').insert({
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp || null,
        organization_name: data.organization_name || null,
        subject: data.subject,
        message: data.message,
        suggestion_type: data.suggestion_type,
        source: data.source,
        tenant_id: data.tenant_id || null,
        user_id: data.user_id || null,
      });

      if (error) throw error;

      toast({
        title: 'Sugestão enviada!',
        description: 'Sua sugestão foi recebida e será analisada pela equipe.',
      });

      return true;
    } catch (error: any) {
      console.error('[useSuggestions] Error submitting:', error);
      toast({
        title: 'Erro ao enviar sugestão',
        description: error?.message || 'Não foi possível enviar sua sugestão',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSuggestionStatus = async (id: string, status: SuggestionStatus): Promise<boolean> => {
    if (!isSuperAdmin) return false;

    try {
      const { error } = await supabase
        .from('suggestions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );

      toast({ title: 'Status atualizado' });
      return true;
    } catch (error: any) {
      console.error('[useSuggestions] Error updating status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: error?.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const respondToSuggestion = async (
    id: string,
    response: string,
    respondedBy: string
  ): Promise<boolean> => {
    if (!isSuperAdmin) return false;

    try {
      const { error } = await supabase
        .from('suggestions')
        .update({
          admin_response: response,
          status: 'responded' as SuggestionStatus,
          responded_at: new Date().toISOString(),
          responded_by: respondedBy,
        })
        .eq('id', id);

      if (error) throw error;

      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                admin_response: response,
                status: 'responded' as SuggestionStatus,
                responded_at: new Date().toISOString(),
                responded_by: respondedBy,
              }
            : s
        )
      );

      toast({ title: 'Resposta enviada' });
      return true;
    } catch (error: any) {
      console.error('[useSuggestions] Error responding:', error);
      toast({
        title: 'Erro ao enviar resposta',
        description: error?.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteSuggestion = async (id: string): Promise<boolean> => {
    if (!isSuperAdmin) return false;

    try {
      const { error } = await supabase.from('suggestions').delete().eq('id', id);

      if (error) throw error;

      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'Sugestão excluída' });
      return true;
    } catch (error: any) {
      console.error('[useSuggestions] Error deleting:', error);
      toast({
        title: 'Erro ao excluir sugestão',
        description: error?.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    suggestions,
    isLoading,
    isSubmitting,
    isSuperAdmin,
    fetchSuggestions,
    submitSuggestion,
    updateSuggestionStatus,
    respondToSuggestion,
    deleteSuggestion,
  };
}
