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
  signUp: (email: string, password: string, fullName: string, tenantName: string) => Promise<{ error: Error | null }>;
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

  const fetchUserData = async (userId: string) => {
    try {
      // Prevent role leakage between sessions/users while we refetch
      setRoles([]);
      setTenantId(null);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      if (profileData) {
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
        setProfile(null);
      }

      // Fetch roles
      // NOTE: roles are tenant-scoped; never load roles from other tenants.
      if (profileData?.tenant_id) {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('tenant_id', profileData.tenant_id);

        if (rolesError) {
          console.error('Error fetching roles:', rolesError);
          setRoles([]);
        } else {
          setRoles((rolesData ?? []).map((r) => r.role as AppRole));
        }
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
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
            fetchUserData(session.user.id);
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
        fetchUserData(session.user.id).finally(() => {
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

  const signUp = async (email: string, password: string, fullName: string, tenantName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          tenant_name: tenantName,
        },
      },
    });

    if (!error && data.user) {
      // Bootstrap user: create tenant (organization) + profile + admin role
      try {
        // Use session from signup response directly (more reliable than getSession)
        let token = data.session?.access_token;
        
        // Fallback: try getSession if signup didn't return session immediately
        if (!token) {
          // Wait briefly for session to be established
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: sessionData } = await supabase.auth.getSession();
          token = sessionData.session?.access_token;
        }
        
        if (!token) {
          console.error('[signUp] No session token available after signup');
          return { error: new Error('Conta criada. Faça login para continuar.') };
        }

        console.log('[signUp] Calling bootstrap-user function...');
        const res = await supabase.functions.invoke('bootstrap-user', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: {
            tenantName,
          },
        });

        if (res.error) {
          console.error('[signUp] Bootstrap function error:', res.error);
          throw res.error;
        }
        if (res.data?.error) {
          console.error('[signUp] Bootstrap response error:', res.data.error);
          throw new Error(res.data.error);
        }
        
        console.log('[signUp] Bootstrap successful:', res.data);
        
        // Refresh user data after bootstrap
        await fetchUserData(data.user.id);
      } catch (bootstrapError: any) {
        console.error('[signUp] Bootstrap error:', bootstrapError);
        return { error: new Error(bootstrapError?.message || 'Falha ao criar sua organização') };
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
