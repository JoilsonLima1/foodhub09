/**
 * PartnerContext - Manages partner authentication and context
 * 
 * Uses direct Supabase queries now that RLS policies use
 * SECURITY DEFINER functions (is_partner_user/is_partner_admin)
 * instead of self-referencing partner_users subqueries.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Partner, PartnerBranding } from '@/hooks/usePartners';

export type PartnerUserRole = 'partner_admin' | 'partner_support';

interface PartnerUser {
  id: string;
  partner_id: string;
  user_id: string;
  role: PartnerUserRole;
  is_active: boolean;
}

interface PartnerContextType {
  currentPartner: Partner | null;
  partnerBranding: PartnerBranding | null;
  partnerUser: PartnerUser | null;
  partnerUserRole: PartnerUserRole | null;
  isPartnerUser: boolean;
  isPartnerAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  refetchPartner: () => Promise<void>;
}

const PartnerContext = createContext<PartnerContextType | undefined>(undefined);

export function PartnerProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [currentPartner, setCurrentPartner] = useState<Partner | null>(null);
  const [partnerBranding, setPartnerBranding] = useState<PartnerBranding | null>(null);
  const [partnerUser, setPartnerUser] = useState<PartnerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartnerData = async () => {
    if (!user) {
      setCurrentPartner(null);
      setPartnerBranding(null);
      setPartnerUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // RLS on partner_users now allows SELECT where user_id = auth.uid()
      const { data: partnerUserData, error: puError } = await supabase
        .from('partner_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (puError) {
        console.error('[PartnerContext] Error fetching partner_user:', puError);
        setIsLoading(false);
        return;
      }

      if (!partnerUserData) {
        setCurrentPartner(null);
        setPartnerBranding(null);
        setPartnerUser(null);
        setIsLoading(false);
        return;
      }

      setPartnerUser({
        id: partnerUserData.id,
        partner_id: partnerUserData.partner_id,
        user_id: partnerUserData.user_id,
        role: (partnerUserData.role || 'partner_admin') as PartnerUserRole,
        is_active: partnerUserData.is_active ?? true,
      });

      // RLS on partners now allows SELECT via is_partner_user()
      const { data: partnerData, error: pError } = await supabase
        .from('partners')
        .select('*')
        .eq('id', partnerUserData.partner_id)
        .single();

      if (pError) {
        console.error('[PartnerContext] Error fetching partner:', pError);
        setError('Erro ao carregar dados do parceiro');
        setIsLoading(false);
        return;
      }

      if (!partnerData.is_active) {
        setError('Parceiro inativo. Entre em contato com o suporte.');
        setIsLoading(false);
        return;
      }

      setCurrentPartner({
        id: partnerData.id,
        name: partnerData.name,
        slug: partnerData.slug,
        email: partnerData.email,
        phone: partnerData.phone,
        document: partnerData.document,
        is_active: partnerData.is_active ?? true,
        max_tenants: partnerData.max_tenants ?? 10,
        max_users_per_tenant: partnerData.max_users_per_tenant ?? 5,
        revenue_share_percent: partnerData.revenue_share_percent ?? 0,
        notes: partnerData.notes,
        created_at: partnerData.created_at ?? '',
        updated_at: partnerData.updated_at ?? '',
      });

      // Fetch partner branding
      const { data: brandingData } = await supabase
        .from('partner_branding')
        .select('*')
        .eq('partner_id', partnerUserData.partner_id)
        .maybeSingle();

      if (brandingData) {
        setPartnerBranding(brandingData as PartnerBranding);
      }

    } catch (err: any) {
      console.error('[PartnerContext] Exception:', err);
      setError(err.message || 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchPartnerData();
    }
  }, [user, authLoading]);

  const partnerUserRole = partnerUser?.role ?? null;
  const isPartnerUser = !!partnerUser;
  const isPartnerAdmin = partnerUserRole === 'partner_admin';

  return (
    <PartnerContext.Provider
      value={{
        currentPartner,
        partnerBranding,
        partnerUser,
        partnerUserRole,
        isPartnerUser,
        isPartnerAdmin,
        isLoading: isLoading || authLoading,
        error,
        refetchPartner: fetchPartnerData,
      }}
    >
      {children}
    </PartnerContext.Provider>
  );
}

export function usePartnerContext() {
  const context = useContext(PartnerContext);
  if (context === undefined) {
    throw new Error('usePartnerContext must be used within a PartnerProvider');
  }
  return context;
}
