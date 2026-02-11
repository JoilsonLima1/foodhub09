import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LegalDocument {
  id: string;
  type: string;
  version: string;
  title: string;
  content: string;
  requires_scroll: boolean;
}

interface AcceptanceStatus {
  document: LegalDocument;
  accepted: boolean;
  accepted_at?: string;
}

export function useLegalAcceptance(tenantId: string | null) {
  const [requiredDocs, setRequiredDocs] = useState<AcceptanceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [allAccepted, setAllAccepted] = useState(false);

  const checkAcceptance = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get all active documents for marketplace
      const { data: docs } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('is_active', true)
        .in('type', ['marketplace_payment_terms', 'privacy_policy', 'split_agreement'])
        .order('type');

      if (!docs || docs.length === 0) {
        setAllAccepted(true);
        setRequiredDocs([]);
        setLoading(false);
        return;
      }

      // Get tenant's acceptances
      const { data: acceptances } = await supabase
        .from('tenant_legal_acceptance')
        .select('document_id, version, accepted_at')
        .eq('tenant_id', tenantId);

      const acceptanceMap = new Map(
        (acceptances || []).map(a => [`${a.document_id}_${a.version}`, a])
      );

      const statuses: AcceptanceStatus[] = (docs as any[]).map(doc => {
        const acceptance = acceptanceMap.get(`${doc.id}_${doc.version}`);
        return {
          document: doc,
          accepted: !!acceptance,
          accepted_at: acceptance?.accepted_at,
        };
      });

      setRequiredDocs(statuses);
      setAllAccepted(statuses.every(s => s.accepted));
    } catch (err) {
      console.error('Error checking legal acceptance:', err);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    checkAcceptance();
  }, [checkAcceptance]);

  const acceptDocuments = async (documentIds: string[]) => {
    if (!tenantId) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const inserts = documentIds.map(docId => {
      const doc = requiredDocs.find(d => d.document.id === docId);
      return {
        tenant_id: tenantId,
        document_id: docId,
        document_type: doc?.document.type || 'unknown',
        version: doc?.document.version || '1.0',
        accepted_user_id: user.id,
        accepted_ip: null, // Will be captured server-side if needed
      };
    });

    const { error } = await supabase
      .from('tenant_legal_acceptance')
      .insert(inserts);

    if (error) {
      console.error('Error accepting documents:', error);
      return false;
    }

    await checkAcceptance();
    return true;
  };

  const canActivateSplit = allAccepted && requiredDocs.length > 0;

  return {
    requiredDocs,
    loading,
    allAccepted,
    canActivateSplit,
    acceptDocuments,
    refresh: checkAcceptance,
  };
}
