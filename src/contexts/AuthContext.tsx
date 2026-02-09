import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, UserWithProfile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserWithProfile['profile'] | null;
  roles: AppRole[];
  tenantId: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, tenantName: string, businessCategory?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserWithProfile['profile'] | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mutex to prevent concurrent bootstrap calls for the same user
  const bootstrapInProgressRef = useRef<Set<string>>(new Set());

  // Helper function to bootstrap user if needed (creates profile + tenant + role)
  const bootstrapUserIfNeeded = async (userId: string, sessionToken: string, userMetadata?: any): Promise<boolean> => {
    // Prevent concurrent bootstrap calls for same user
    if (bootstrapInProgressRef.current.has(userId)) {
      console.log('[AuthContext] Bootstrap already in progress for:', userId);
      return false;
    }
    
    bootstrapInProgressRef.current.add(userId);
    
    try {
      console.log('[AuthContext] Checking if user needs bootstrap...');
      
      const res = await supabase.functions.invoke('bootstrap-user', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: {
          tenantName: userMetadata?.tenant_name || userMetadata?.full_name,
        },
      });

      if (res.error) {
        console.error('[AuthContext] Bootstrap error:', res.error);
        return false;
      }

      if (res.data?.error) {
        console.error('[AuthContext] Bootstrap response error:', res.data.error);
        return false;
      }

      console.log('[AuthContext] Bootstrap completed:', res.data);
      return true;
    } catch (error) {
      console.error('[AuthContext] Bootstrap exception:', error);
      return false;
    } finally {
      bootstrapInProgressRef.current.delete(userId);
    }
  };

  const fetchUserData = async (userId: string, sessionToken?: string, userMetadata?: any) => {
    try {
      // Prevent role leakage between sessions/users while we refetch
      setRoles([]);
      setTenantId(null);

      console.log('[AuthContext] Fetching user data for:', userId);

      // Fetch profile - use maybeSingle since profile might not exist yet
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[AuthContext] Error fetching profile:', profileError);
      }

      // If no profile or no tenant, try to bootstrap
      // But skip bootstrap for partner users - they don't need a tenant
      const isPartner = userMetadata?.is_partner === true;
      const { data: partnerLink } = await supabase
        .from('partner_users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if ((!profileData || !profileData.tenant_id) && sessionToken && !isPartner && !partnerLink) {
        console.log('[AuthContext] No profile/tenant found - triggering bootstrap...');
        const bootstrapped = await bootstrapUserIfNeeded(userId, sessionToken, userMetadata);
        
        if (bootstrapped) {
          // Refetch profile after bootstrap
          const { data: newProfileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          
          profileData = newProfileData;
        }
      } else if (isPartner || partnerLink) {
        console.log('[AuthContext] Partner user detected - skipping tenant bootstrap');
      }

      if (profileData) {
        console.log('[AuthContext] Profile found:', { 
          id: profileData.id, 
          tenant_id: profileData.tenant_id,
          store_id: profileData.store_id,
          full_name: profileData.full_name 
        });
        
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          phone: profileData.phone,
          tenant_id: profileData.tenant_id,
          store_id: profileData.store_id,
          is_active: profileData.is_active ?? true,
        });
        setTenantId(profileData.tenant_id);
      } else {
        console.log('[AuthContext] No profile found for user');
        setProfile(null);
      }

      // Fetch roles in two passes:
      // 1. Always fetch super_admin role (global, not tenant-scoped)
      // 2. If tenant_id exists, fetch tenant-specific roles
      const allRoles: AppRole[] = [];

      // First: Check for global super_admin role (bypasses tenant filtering)
      const { data: superAdminData, error: superAdminError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'super_admin');

      if (superAdminError) {
        console.error('[AuthContext] Error fetching super_admin role:', superAdminError);
      } else if (superAdminData && superAdminData.length > 0) {
        allRoles.push('super_admin');
        console.log('[AuthContext] Super admin role found');
      }

      // Second: Fetch tenant-scoped roles if tenant_id exists
      if (profileData?.tenant_id) {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('tenant_id', profileData.tenant_id)
          .neq('role', 'super_admin'); // Avoid duplicating super_admin

        if (rolesError) {
          console.error('[AuthContext] Error fetching tenant roles:', rolesError);
        } else {
          const tenantRoles = (rolesData ?? []).map((r) => r.role as AppRole);
          allRoles.push(...tenantRoles);
          console.log('[AuthContext] Tenant roles fetched:', tenantRoles);
        }
      } else {
        console.log('[AuthContext] No tenant_id - skipping tenant role fetch');
      }

      console.log('[AuthContext] All roles:', allRoles);
      setRoles(allRoles);
    } catch (error) {
      console.error('[AuthContext] Error fetching user data:', error);
      setProfile(null);
      setRoles([]);
      setTenantId(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer data fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(
              session.user.id, 
              session.access_token, 
              session.user.user_metadata
            );
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setTenantId(null);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRoles([]);
          setTenantId(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(
          session.user.id, 
          session.access_token, 
          session.user.user_metadata
        ).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, tenantName: string, businessCategory?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    console.log('[signUp] Starting signup for:', email, 'with category:', businessCategory);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          tenant_name: tenantName,
          business_category: businessCategory || 'restaurant',
        },
      },
    });

    if (error) {
      console.error('[signUp] Signup error:', error);
      return { error };
    }

    if (data.user) {
      console.log('[signUp] User created successfully:', data.user.id);
      // Bootstrap will be triggered by onAuthStateChange -> fetchUserData
      // No need to call it here - this prevents race condition
    }

    return { error };
  };

  const signOut = async () => {
    try { localStorage.removeItem('active_context'); } catch { /* ignore */ }
    await supabase.auth.signOut();
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const hasAnyRole = (checkRoles: AppRole[]) => 
    checkRoles.some(role => roles.includes(role));

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        tenantId,
        isLoading,
        signIn,
        signUp,
        signOut,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
