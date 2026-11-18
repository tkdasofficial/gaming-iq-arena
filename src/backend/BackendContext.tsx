import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { checkIsAdmin, subscribeSavedResults, type SavedResult } from './services';
import { toAppUser, type AppUser } from './user';

interface BackendContextValue {
  user: AppUser | null;
  authReady: boolean;
  isAdmin: boolean;
  authError: string | null;
  savedResults: SavedResult[];
  savedLoaded: boolean;
  savedError: string | null;
  /** Opens the sign-in page (email/password or Google). */
  requestSignIn: () => void;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}

const BackendContext = createContext<BackendContextValue | null>(null);

export function BackendProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const applySession = async (nextUser: AppUser | null) => {
      if (cancelled) return;
      setUser((prev) => (prev && nextUser && prev.uid === nextUser.uid ? prev : nextUser));
      if (nextUser) {
        // Admin role lives in user_roles (granted server-side), never on the client.
        const admin = await checkIsAdmin(nextUser.uid);
        if (!cancelled) setIsAdmin(admin);
      } else {
        setIsAdmin(false);
        setSavedResults([]);
      }
      if (!cancelled) setAuthReady(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      // Defer Supabase calls out of the auth callback to avoid client deadlocks.
      window.setTimeout(() => void applySession(session?.user ? toAppUser(session.user) : null), 0);
    });
    void supabase.auth.getUser().then(({ data }) => void applySession(data.user ? toAppUser(data.user) : null));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      setSavedLoaded(authReady);
      return;
    }
    setSavedLoaded(false);
    setSavedError(null);
    return subscribeSavedResults(
      user.uid,
      (items) => {
        setSavedResults(items);
        setSavedLoaded(true);
      },
      (message) => {
        setSavedError(message);
        setSavedLoaded(true);
      }
    );
  }, [authReady, user]);

  const requestSignIn = useCallback(() => {
    setAuthError(null);
    void navigate({ to: '/auth' });
  }, [navigate]);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <BackendContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        authError,
        savedResults,
        savedLoaded,
        savedError,
        requestSignIn,
        signOutUser,
        clearAuthError,
      }}
    >
      {children}
    </BackendContext.Provider>
  );
}

export function useBackend(): BackendContextValue {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error('useBackend must be used inside BackendProvider');
  return ctx;
}
