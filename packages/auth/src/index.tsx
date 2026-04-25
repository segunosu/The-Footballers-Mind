import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { TpmClient } from '@tpm/supabase';

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ client, children }: { client: TpmClient; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [client]);

  const signInWithEmail = useCallback<AuthState['signInWithEmail']>(async (email) => {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    return error ? { error: error.message } : {};
  }, [client]);

  const signOut = useCallback(async () => {
    await client.auth.signOut();
    window.location.assign(window.location.pathname);
  }, [client]);

  const value = useMemo<AuthState>(() => ({
    user: session?.user ?? null,
    session, loading, signInWithEmail, signOut,
  }), [session, loading, signInWithEmail, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function RequireAuth({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <>{fallback}</>;
  return <>{children}</>;
}

export function SignOutButton() {
  const { signOut, user } = useAuth();
  if (!user) return null;
  return (
    <button
      type="button"
      onClick={() => signOut()}
      aria-label="Sign out"
      title={user.email ?? 'Signed in'}
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 1000,
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(10,31,68,0.18)',
        borderRadius: 999,
        padding: '5px 11px',
        fontSize: 11,
        fontWeight: 700,
        color: '#4c617f',
        cursor: 'pointer',
        letterSpacing: '0.02em',
        fontFamily: 'inherit',
      }}
    >
      Sign out
    </button>
  );
}
