/**
 * PartnerContext - Manages partner authentication and context
 * 
 * Uses the partner_whoami edge function (service_role) to bypass RLS
 * on partner_users, then fetches partner details if confirmed.
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

      // Use edge function to bypass RLS on partner_users
      const { data: whoami, error: fnError } = await supabase.functions.invoke('partner_whoami');

      if (fnError) {
        console.error('[PartnerContext] partner_whoami error:', fnError);
        setIsLoading(false);
        return;
      }

      if (!whoami?.is_partner) {
        // User is not a partner user
        console.info('[PartnerContext] Not a partner:', whoami?.reason);
        setCurrentPartner(null);
        setPartnerBranding(null);
        setPartnerUser(null);
        setIsLoading(false);
        return;
      }

      // Build partner user from whoami response
      setPartnerUser({
        id: whoami.partner_id, // we don't have partner_user.id from whoami, use partner_id as key
        partner_id: whoami.partner_id,
        user_id: user.id,
        role: (whoami.role || 'partner_admin') as PartnerUserRole,
        is_active: true,
      });

      // Fetch full partner data (partners table should be readable or we use the name from whoami)
      const { data: partnerData, error: pError } = await supabase
        .from('partners')
        .select('*')
        .eq('id', whoami.partner_id)
        .single();

      if (pError) {
        console.error('[PartnerContext] Error fetching partner:', pError);
        // Fallback: use data from whoami
        setCurrentPartner({
          id: whoami.partner_id,
          name: whoami.partner_name || 'Parceiro',
          slug: '',
          email: null,
          phone: null,
          document: null,
          is_active: true,
          max_tenants: 10,
          max_users_per_tenant: 5,
          revenue_share_percent: 0,
          notes: null,
          created_at: '',
          updated_at: '',
        });
        setIsLoading(false);
        // Still try branding below
      } else {
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
      }

      // Fetch partner branding
      const { data: brandingData } = await supabase
        .from('partner_branding')
        .select('*')
        .eq('partner_id', whoami.partner_id)
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
