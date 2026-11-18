import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import type {
  AimLabRun,
  BrandRecord,
  DeviceProfile,
  ProPreset,
  SavedSetup,
} from '../engine/types';
import {
  clearDeviceDatabaseCache,
  fetchAllPublicDevices,
  fetchBrands,
  fetchDevicesByBrand,
} from './deviceDatabase';
import {
  checkIsAdmin,
  subscribeAimLabRuns,
  subscribeCustomDevices,
  subscribePublicPresets,
  subscribeSavedSetups,
} from './services';
import { toAppUser, type AppUser } from './user';

interface BackendContextValue {
  user: AppUser | null;
  authReady: boolean;
  isAdmin: boolean;
  authError: string | null;
  signingIn: boolean;
  savedSetups: SavedSetup[];
  customDevices: DeviceProfile[];
  brands: BrandRecord[];
  brandsLoading: boolean;
  brandsError: string | null;
  brandDevices: Record<string, DeviceProfile[]>;
  devicesLoadingBrand: string | null;
  devicesError: string | null;
  catalogDevices: DeviceProfile[];
  catalogLoading: boolean;
  aimLabRuns: AimLabRun[];
  publicPresets: ProPreset[];
  presetsLoaded: boolean;
  loadBrands: (forceRefresh?: boolean) => Promise<BrandRecord[]>;
  loadBrandDevices: (brandId: string, forceRefresh?: boolean) => Promise<DeviceProfile[]>;
  loadCatalogDevices: (forceRefresh?: boolean) => Promise<DeviceProfile[]>;
  refreshDeviceDatabase: () => Promise<void>;
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
  const signingIn = false;

  const [savedSetups, setSavedSetups] = useState<SavedSetup[]>([]);
  const [customDevices, setCustomDevices] = useState<DeviceProfile[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [brandDevices, setBrandDevices] = useState<Record<string, DeviceProfile[]>>({});
  const [devicesLoadingBrand, setDevicesLoadingBrand] = useState<string | null>(null);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [catalogDevices, setCatalogDevices] = useState<DeviceProfile[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [aimLabRuns, setAimLabRuns] = useState<AimLabRun[]>([]);
  const [publicPresets, setPublicPresets] = useState<ProPreset[]>([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);

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
        setSavedSetups([]);
        setCustomDevices([]);
        setAimLabRuns([]);
      }
      if (!cancelled) setAuthReady(true);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      // Defer Supabase calls out of the auth callback to avoid client deadlocks.
      window.setTimeout(() => {
        void applySession(session?.user ? toAppUser(session.user) : null);
      }, 0);
    });
    void supabase.auth.getUser().then(({ data }) => {
      void applySession(data.user ? toAppUser(data.user) : null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadBrands = useCallback(async (forceRefresh = false): Promise<BrandRecord[]> => {
    setBrandsLoading(true);
    setBrandsError(null);
    try {
      const items = await fetchBrands(forceRefresh);
      setBrands(items);
      return items;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to load smartphone brands from the cloud catalog.';
      setBrandsError(msg);
      return [];
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  const loadBrandDevices = useCallback(
    async (brandId: string, forceRefresh = false): Promise<DeviceProfile[]> => {
      if (!brandId) return [];
      setDevicesLoadingBrand(brandId);
      setDevicesError(null);
      try {
        const items = await fetchDevicesByBrand(brandId, forceRefresh);
        setBrandDevices((prev) => ({ ...prev, [brandId]: items }));
        return items;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to load smartphone models from the cloud catalog.';
        setDevicesError(msg);
        return [];
      } finally {
        setDevicesLoadingBrand((prev) => (prev === brandId ? null : prev));
      }
    },
    []
  );

  const loadCatalogDevices = useCallback(
    async (forceRefresh = false): Promise<DeviceProfile[]> => {
      setCatalogLoading(true);
      try {
        const items = await fetchAllPublicDevices(forceRefresh);
        setCatalogDevices(items);
        return items;
      } catch {
        return [];
      } finally {
        setCatalogLoading(false);
      }
    },
    []
  );

  const refreshDeviceDatabase = useCallback(async () => {
    clearDeviceDatabaseCache();
    setBrandDevices({});
    setCatalogDevices([]);
    await loadBrands(true);
  }, [loadBrands]);

  // Public non-PII catalog listeners & initial brands load (attached only after auth initializes)
  useEffect(() => {
    if (!authReady) return;
    const unsubPresets = subscribePublicPresets((items) => {
      setPublicPresets(items);
      setPresetsLoaded(true);
    });
    void loadBrands();
    return () => {
      unsubPresets();
    };
  }, [authReady, loadBrands]);

  // Authenticated private user data listeners
  useEffect(() => {
    if (!authReady || !user) return;
    const unsubSetups = subscribeSavedSetups(user.uid, setSavedSetups);
    const unsubCustomDevices = subscribeCustomDevices(user.uid, setCustomDevices);
    const unsubRuns = subscribeAimLabRuns(user.uid, setAimLabRuns);
    return () => {
      unsubSetups();
      unsubCustomDevices();
      unsubRuns();
    };
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
        signingIn,
        savedSetups,
        customDevices,
        brands,
        brandsLoading,
        brandsError,
        brandDevices,
        devicesLoadingBrand,
        devicesError,
        catalogDevices,
        catalogLoading,
        aimLabRuns,
        publicPresets,
        presetsLoaded,
        loadBrands,
        loadBrandDevices,
        loadCatalogDevices,
        refreshDeviceDatabase,
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
  if (!ctx) {
    throw new Error('useBackend must be used inside BackendProvider');
  }
  return ctx;
}
