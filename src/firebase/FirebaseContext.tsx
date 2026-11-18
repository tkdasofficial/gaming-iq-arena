import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import type {
  AimLabRun,
  BrandRecord,
  DeviceProfile,
  ProPreset,
  SavedSetup,
} from '../engine/types';
import { auth, googleProvider } from './config';
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
  syncUserProfile,
} from './services';

interface FirebaseContextValue {
  user: User | null;
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
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

const BOOTSTRAP_ADMIN_EMAIL = 'tusharkantidasofficial@gmail.com';

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

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
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          await syncUserProfile(nextUser);
          const adminDoc = await checkIsAdmin(nextUser.uid);
          setIsAdmin(
            adminDoc ||
              (nextUser.emailVerified && nextUser.email === BOOTSTRAP_ADMIN_EMAIL)
          );
        } catch (err) {
          console.error('Failed to sync user profile:', err);
        }
      } else {
        setIsAdmin(false);
        setSavedSetups([]);
        setCustomDevices([]);
        setAimLabRuns([]);
      }
      setAuthReady(true);
    });
    return unsub;
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
        err instanceof Error ? err.message : 'Unable to load smartphone brands from Firestore.';
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
            : 'Unable to load smartphone models from Firestore.';
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

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    setAuthError(null);
    setSigningIn(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to sign in with Google.';
      if (!message.includes('auth/popup-closed-by-user')) {
        setAuthError(message);
      }
      return null;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <FirebaseContext.Provider
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
        signInWithGoogle,
        signOutUser,
        clearAuthError,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside FirebaseProvider');
  }
  return ctx;
}
