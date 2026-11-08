import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  display_name: string;
  avatar_key: string;
  avatar_url: string | null;
  christmas_emoji: string;
  role: 'user' | 'admin';
  created_at: string;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const GENERIC_ERROR = 'No hemos podido completar la operación. Inténtalo de nuevo.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_key, avatar_url, christmas_emoji, role, created_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('profile load failed', error);
      setProfile(null);
      return;
    }
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      (async () => {
        await loadProfile(data.session?.user.id);
        if (active) setLoading(false);
      })();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      (async () => {
        await loadProfile(nextSession?.user.id);
      })();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    await loadProfile(session?.user.id);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('sign in failed', error);
      return false;
    }
    return true;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.session) {
      console.error('sign up failed', error);
      return false;
    }
    return true;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('sign out failed', error);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isAdmin: profile?.role === 'admin',
        loading,
        refreshProfile,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export { GENERIC_ERROR };
