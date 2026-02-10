/**
 * useActiveContext - Single source of truth for the user's active context.
 * 
 * Resolution priority (on login / first load):
 * 1. super_admin role → 'super_admin'
 * 2. partner_users record → 'partner'
 * 3. tenant profile → 'tenant'
 * 
 * Users with multiple contexts can switch manually.
 * The active context is persisted in localStorage.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePartnerContext } from '@/contexts/PartnerContext';

export type ActiveContextType = 'super_admin' | 'partner' | 'tenant';

interface ActiveContextValue {
  /** Current active context */
  contextType: ActiveContextType;
  /** Partner ID when context is 'partner' */
  partnerId: string | null;
  /** Tenant ID when context is 'tenant' */
  tenantId: string | null;
  /** All contexts available for this user */
  availableContexts: ActiveContextType[];
  /** Whether user can switch between contexts */
  canSwitch: boolean;
  /** Switch to a different context */
  switchContext: (type: ActiveContextType) => void;
  /** Whether context resolution is still loading */
  isLoading: boolean;
  /** Get the default redirect path for the current context */
  getDefaultRoute: () => string;
}

const STORAGE_KEY = 'active_context';
const DESIRED_CONTEXT_KEY = 'desired_context_type';

function getStoredContext(): ActiveContextType | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'super_admin' || stored === 'partner' || stored === 'tenant') {
      return stored;
    }
  } catch { /* ignore */ }
  return null;
}

function storeContext(type: ActiveContextType) {
  try {
    localStorage.setItem(STORAGE_KEY, type);
  } catch { /* ignore */ }
}

/** Set a one-shot desired context that overrides normal resolution on next login */
export function setDesiredContext(type: ActiveContextType) {
  try {
    localStorage.setItem(DESIRED_CONTEXT_KEY, type);
  } catch { /* ignore */ }
}

function consumeDesiredContext(): ActiveContextType | null {
  try {
    const desired = localStorage.getItem(DESIRED_CONTEXT_KEY);
    if (desired === 'super_admin' || desired === 'partner' || desired === 'tenant') {
      localStorage.removeItem(DESIRED_CONTEXT_KEY);
      return desired;
    }
  } catch { /* ignore */ }
  return null;
}

export function useActiveContext(): ActiveContextValue {
  const { user, roles, tenantId, isLoading: authLoading } = useAuth();
  const { isPartnerUser, currentPartner, isLoading: partnerLoading } = usePartnerContext();

  const isLoading = authLoading || partnerLoading;

  // Compute available contexts
  const availableContexts = useMemo<ActiveContextType[]>(() => {
    if (!user) return [];
    const contexts: ActiveContextType[] = [];
    if (roles.includes('super_admin')) contexts.push('super_admin');
    if (isPartnerUser && currentPartner) contexts.push('partner');
    if (tenantId) contexts.push('tenant');
    return contexts;
  }, [user, roles, isPartnerUser, currentPartner, tenantId]);

  // Resolve initial context
  const resolvedDefault = useMemo<ActiveContextType>(() => {
    if (availableContexts.length === 0) return 'tenant'; // fallback
    // Priority: super_admin > partner > tenant
    if (availableContexts.includes('super_admin')) return 'super_admin';
    if (availableContexts.includes('partner')) return 'partner';
    return 'tenant';
  }, [availableContexts]);

  const [contextType, setContextType] = useState<ActiveContextType>(() => {
    const stored = getStoredContext();
    return stored || 'tenant';
  });

  // Once loading finishes, resolve the context
  useEffect(() => {
    if (isLoading || !user) return;

    // 1. Check for one-shot desired context (from "Login de parceiro" etc.)
    const desired = consumeDesiredContext();
    if (desired && availableContexts.includes(desired)) {
      console.info('[CTX_PICK]', { availableContexts, desired_context_type: desired, chosenType: desired, reason: 'desired_context_type' });
      setContextType(desired);
      storeContext(desired);
      return;
    }

    // 2. If stored context is valid for this user, keep it
    const stored = getStoredContext();
    if (stored && availableContexts.includes(stored)) {
      console.info('[CTX_PICK]', { availableContexts, desired_context_type: null, chosenType: stored, reason: 'stored_context' });
      setContextType(stored);
      return;
    }

    // 3. Otherwise use resolved default (super_admin > partner > tenant)
    console.info('[CTX_PICK]', { availableContexts, desired_context_type: null, chosenType: resolvedDefault, reason: 'resolved_default' });
    setContextType(resolvedDefault);
    storeContext(resolvedDefault);
  }, [isLoading, user, availableContexts, resolvedDefault]);

  const switchContext = useCallback((type: ActiveContextType) => {
    if (availableContexts.includes(type)) {
      setContextType(type);
      storeContext(type);
    }
  }, [availableContexts]);

  const getDefaultRoute = useCallback(() => {
    switch (contextType) {
      case 'super_admin': return '/super-admin';
      case 'partner': return '/partner/dashboard';
      case 'tenant': return '/dashboard';
      // SAFETY: if context not yet resolved, return '/' to avoid sending partner to /dashboard
      default: return '/';
    }
  }, [contextType]);

  return {
    contextType,
    partnerId: contextType === 'partner' ? currentPartner?.id ?? null : null,
    tenantId: contextType === 'tenant' ? tenantId : null,
    availableContexts,
    canSwitch: availableContexts.length > 1,
    switchContext,
    isLoading,
    getDefaultRoute,
  };
}
