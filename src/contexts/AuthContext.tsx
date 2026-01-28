import React, { createContext, useContext, useEffect, useState } from 'react';
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

  // Helper function to bootstrap user if needed (creates profile + tenant + role)
  const bootstrapUserIfNeeded = async (userId: string, sessionToken: string, userMetadata?: any): Promise<boolean> => {
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
      if ((!profileData || !profileData.tenant_id) && sessionToken) {
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
      }

      if (profileData) {
        console.log('[AuthContext] Profile found:', { 
          id: profileData.id, 
          tenant_id: profileData.tenant_id,
          full_name: profileData.full_name 
        });
        
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          phone: profileData.phone,
          tenant_id: profileData.tenant_id,
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

    if (!error && data.user) {
      console.log('[signUp] User created successfully:', data.user.id);
      
      // Bootstrap user: create tenant (organization) + profile + admin role
      try {
        // Use session from signup response directly (more reliable than getSession)
        let token = data.session?.access_token;
        
        // Fallback: try getSession if signup didn't return session immediately
        if (!token) {
          console.log('[signUp] No session in response, waiting for session...');
          // Wait briefly for session to be established
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: sessionData } = await supabase.auth.getSession();
          token = sessionData.session?.access_token;
        }
        
        if (!token) {
          console.error('[signUp] No session token available after signup');
          // Don't fail - the user was created, they just need to log in
          return { error: new Error('Conta criada com sucesso! Faça login para continuar.') };
        }

        console.log('[signUp] Token obtained, calling bootstrap-user...');
        
        const res = await supabase.functions.invoke('bootstrap-user', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: {
            tenantName,
            businessCategory,
          },
        });

        console.log('[signUp] Bootstrap response:', res);

        if (res.error) {
          console.error('[signUp] Bootstrap function error:', res.error);
          // Don't throw - user was created, just bootstrap failed
          // They can retry by logging in
          return { error: new Error('Conta criada, mas houve um erro ao configurar. Faça login para continuar.') };
        }
        
        if (res.data?.error) {
          console.error('[signUp] Bootstrap response error:', res.data.error);
          return { error: new Error('Conta criada, mas houve um erro ao configurar. Faça login para continuar.') };
        }
        
        console.log('[signUp] Bootstrap successful:', res.data);
        
        // Refresh user data after bootstrap
        await fetchUserData(data.user.id);
        
      } catch (bootstrapError: any) {
        console.error('[signUp] Bootstrap error:', bootstrapError);
        // Don't fail completely - user was created
        return { error: new Error('Conta criada! Faça login para finalizar a configuração.') };
      }
    }

    return { error };
  };

  const signOut = async () => {
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
