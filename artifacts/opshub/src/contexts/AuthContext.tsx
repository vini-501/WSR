import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useGetMe } from '@workspace/api-client-react';
import { UserProfile } from '@workspace/api-client-react';
import { setAuthTokenGetter } from '@workspace/api-client-react';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  demoSignIn: (role: 'admin' | 'management' | 'department_head' | 'employee') => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [demoRole, setDemoRole] = useState<string | null>(() => localStorage.getItem("demo_role"));
  const [isLoading, setIsLoading] = useState(true);

  const initializedRef = useRef(false);

  useEffect(() => {
    const savedDemoRole = localStorage.getItem("demo_role");
    if (savedDemoRole) {
      const mockUser = {
        id: `demo-${savedDemoRole}`,
        email: `${savedDemoRole}@ellipsonic.com`,
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User;

      const mockSession = {
        access_token: `demo-token-${savedDemoRole}`,
        token_type: "bearer",
        user: mockUser,
      } as Session;

      setSession(mockSession);
      setUser(mockUser);
      setAuthTokenGetter(async () => `demo-token-${savedDemoRole}`);
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        setAuthTokenGetter(async () => {
          const { data } = await supabase.auth.getSession();
          return data.session?.access_token ?? null;
        });
      }
      initializedRef.current = true;
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initializedRef.current && event === 'INITIAL_SESSION') {
        return;
      }
      if (!localStorage.getItem("demo_role")) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session) {
          setAuthTokenGetter(async () => {
            const { data } = await supabase.auth.getSession();
            return data.session?.access_token ?? null;
          });
        } else {
          setAuthTokenGetter(null);
        }
      }
      initializedRef.current = true;
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [demoRole]);

  const { data: profile } = useGetMe({ 
    query: { 
      enabled: !!session, 
      queryKey: ['/api/auth/me', session?.user?.id, demoRole] 
    } 
  });

  const signIn = async (email: string, password: string) => {
    localStorage.removeItem("demo_role");
    setDemoRole(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const demoSignIn = async (role: 'admin' | 'management' | 'department_head' | 'employee') => {
    localStorage.setItem("demo_role", role);
    setDemoRole(role);
    const mockUser = {
      id: `demo-${role}`,
      email: `${role}@ellipsonic.com`,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as User;

    const mockSession = {
      access_token: `demo-token-${role}`,
      token_type: "bearer",
      user: mockUser,
    } as Session;

    setSession(mockSession);
    setUser(mockUser);
    setAuthTokenGetter(async () => `demo-token-${role}`);
  };

  const signOut = async () => {
    localStorage.removeItem("demo_role");
    setDemoRole(null);
    setSession(null);
    setUser(null);
    setAuthTokenGetter(null);
    try {
      await supabase.auth.signOut();
    } catch {}
  };

  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user, profile: profile || null, signIn, demoSignIn, signOut, forgotPassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
