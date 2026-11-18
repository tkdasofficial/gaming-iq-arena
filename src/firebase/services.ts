import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  AimLabRun,
  CalibrationInput,
  DeviceProfile,
  GameId,
  ProPreset,
  SavedSetup,
} from '../engine/types';
import { db } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { BLUEPRINT_LIMITS, clampNumber, clampString, sanitizeId } from './validation';

function toIsoString(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function toTimestampMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function buildDeviceMap(device: DeviceProfile) {
  const refreshHz = clampNumber(Math.round(device.refreshHz || 120), 60, 240);
  const os =
    device.os === 'iOS'
      ? ('iOS' as const)
      : device.os === 'HarmonyOS'
        ? ('HarmonyOS' as const)
        : ('Android' as const);
  return {
    id: sanitizeId(device.id || `${device.brand}-${device.model}`, 'device'),
    brand: clampString(device.brand, BLUEPRINT_LIMITS.deviceBrandMaxLength, 'Device'),
    model: clampString(device.model, BLUEPRINT_LIMITS.deviceModelMaxLength, 'Unknown'),
    os,
    chipset: clampString(
      device.chipset,
      BLUEPRINT_LIMITS.deviceChipsetMaxLength,
      'Mobile SoC'
    ),
    ramGb: clampNumber(Math.round(device.ramGb), 1, 64),
    storageGb: clampNumber(Math.round(device.storageGb), 16, 4096),
    screenInches: clampNumber(Number(device.screenInches.toFixed(2)), 4.5, 14.0),
    resolution: clampString(
      device.resolution,
      BLUEPRINT_LIMITS.deviceResolutionMaxLength,
      '2400 × 1080'
    ),
    refreshHz,
    touchSamplingHz: clampNumber(Math.round(device.touchSamplingHz ?? 240), 60, 3000),
    tier: device.tier || 'Mid-Range',
  };
}

function hydrateDeviceProfile(raw: Record<string, unknown>, id: string): DeviceProfile {
  const refreshHz = clampNumber(Math.round(Number(raw.refreshHz) || 120), 60, 240);
  const ramGb = Number(raw.ramGb) || 8;
  const rawTouch =
    typeof raw.touchSamplingHz === 'number' && Number.isFinite(raw.touchSamplingHz)
      ? raw.touchSamplingHz
      : null;
  const os =
    raw.os === 'iOS'
      ? ('iOS' as const)
      : raw.os === 'HarmonyOS'
        ? ('HarmonyOS' as const)
        : ('Android' as const);
  return {
    id: String(raw.id || id),
    brand: String(raw.brand || ''),
    model: String(raw.model || ''),
    os,
    chipset: String(raw.chipset || 'Mobile SoC'),
    ramGb,
    storageGb: Number(raw.storageGb) || 128,
    screenInches: Number(raw.screenInches) || 6.7,
    resolution: String(raw.resolution || '2400 × 1080'),
    refreshHz,
    touchSamplingHz: rawTouch,
    supportedFpsByGame: {
      'free-fire': refreshHz >= 90 ? ['30 FPS', '60 FPS', '90 FPS'] : ['30 FPS', '60 FPS'],
      'pubg-bgmi':
        refreshHz >= 90
          ? ['40 FPS (Ultra)', '60 FPS (Extreme)', '90 FPS']
          : ['30 FPS (High)', '40 FPS (Ultra)', '60 FPS (Extreme)'],
    },
    tier: (raw.tier as DeviceProfile['tier']) || 'Mid-Range',
  };
}

export async function syncUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const displayName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Player',
    BLUEPRINT_LIMITS.userDisplayNameMaxLength,
    'Player'
  );
  const email = clampString(
    user.email || '',
    BLUEPRINT_LIMITS.userEmailMaxLength,
    'unknown@example.com'
  );
  const photoURL = user.photoURL
    ? clampString(user.photoURL, BLUEPRINT_LIMITS.userPhotoMaxLength)
    : undefined;

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        uid: user.uid,
        displayName,
        email,
        role: 'player',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (photoURL) payload.photoURL = photoURL;
      await setDoc(ref, payload);
    } else {
      const updatePayload: Record<string, unknown> = {
        displayName,
        updatedAt: serverTimestamp(),
      };
      if (photoURL) updatePayload.photoURL = photoURL;
      await updateDoc(ref, updatePayload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function checkIsAdmin(uid: string): Promise<boolean> {
  const path = `admins/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    // Non-admin users receive permission-denied or missing doc on /admins/{uid}
    return false;
  }
}

export function subscribeSavedSetups(
  uid: string,
  onData: (items: SavedSetup[]) => void
): Unsubscribe {
  const path = `users/${uid}/savedSetups`;
  const q = query(collection(db, 'users', uid, 'savedSetups'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: { sortMs: number; setup: SavedSetup }[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const device = hydrateDeviceProfile((d.device || {}) as Record<string, unknown>, docSnap.id);
        rows.push({
          sortMs: toTimestampMillis(d.createdAt),
          setup: {
            id: docSnap.id,
            name: String(d.name || 'Saved Setup'),
            createdAt: toIsoString(d.createdAt),
            input: {
              game: d.game === 'pubg-bgmi' ? 'pubg-bgmi' : 'free-fire',
              device,
              claw: d.claw,
              playstyle: d.playstyle,
              gyro: d.gyro,
              preferredFps: String(d.preferredFps || '60 FPS'),
              fireButtonSize:
                typeof d.fireButtonSize === 'number' ? d.fireButtonSize : undefined,
              dpiOverride: typeof d.dpiOverride === 'string' ? d.dpiOverride : undefined,
              cameraPref: d.cameraPref,
              currentSensitivity:
                typeof d.currentSensitivity === 'string' ? d.currentSensitivity : undefined,
            },
            sliders: (d.sliders || {}) as Record<string, number>,
          },
        });
      });
      rows.sort((a, b) => b.sortMs - a.sortMs);
      onData(rows.map((r) => r.setup));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createSavedSetup(
  uid: string,
  name: string,
  input: CalibrationInput,
  sliders: Record<string, number>
): Promise<string> {
  const setupId = sanitizeId(`giq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, 'giq');
  const path = `users/${uid}/savedSetups/${setupId}`;
  const cleanName = clampString(
    name,
    BLUEPRINT_LIMITS.setupNameMaxLength,
    `${input.device.brand} ${input.device.model}`
  );
  const payload: Record<string, unknown> = {
    id: setupId,
    ownerId: uid,
    name: cleanName,
    game: input.game,
    device: buildDeviceMap(input.device),
    claw: input.claw,
    playstyle: input.playstyle,
    gyro: input.gyro,
    preferredFps: clampString(
      input.preferredFps,
      BLUEPRINT_LIMITS.preferredFpsMaxLength,
      '60 FPS'
    ),
    sliders,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (typeof input.fireButtonSize === 'number') {
    payload.fireButtonSize = clampNumber(Math.round(input.fireButtonSize), 30, 80);
  }
  if (input.dpiOverride && input.dpiOverride.trim()) {
    payload.dpiOverride = clampString(
      input.dpiOverride,
      BLUEPRINT_LIMITS.dpiOverrideMaxLength
    );
  }
  if (input.cameraPref) {
    payload.cameraPref = input.cameraPref;
  }
  if (input.currentSensitivity && input.currentSensitivity.trim()) {
    payload.currentSensitivity = clampString(
      input.currentSensitivity,
      BLUEPRINT_LIMITS.currentSensitivityMaxLength
    );
  }

  try {
    await setDoc(doc(db, 'users', uid, 'savedSetups', setupId), payload);
    return setupId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeSavedSetup(uid: string, setupId: string): Promise<void> {
  const path = `users/${uid}/savedSetups/${setupId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'savedSetups', setupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeCustomDevices(
  uid: string,
  onData: (items: DeviceProfile[]) => void
): Unsubscribe {
  const path = `users/${uid}/customDevices`;
  const q = query(collection(db, 'users', uid, 'customDevices'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: { sortMs: number; device: DeviceProfile }[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        rows.push({
          sortMs: toTimestampMillis(d.createdAt),
          device: hydrateDeviceProfile(d, docSnap.id),
        });
      });
      rows.sort((a, b) => b.sortMs - a.sortMs);
      onData(rows.map((r) => r.device));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveCustomDevice(uid: string, device: DeviceProfile): Promise<string> {
  const baseSlug = sanitizeId(`${device.brand}-${device.model}`, 'device').toLowerCase();
  const deviceId =
    device.id && !['manual-device', 'custom-device'].includes(device.id)
      ? sanitizeId(device.id, 'device')
      : `${baseSlug}-${Date.now().toString(36)}`;
  const path = `users/${uid}/customDevices/${deviceId}`;
  const cleanMap = buildDeviceMap({ ...device, id: deviceId });

  try {
    const ref = doc(db, 'users', uid, 'customDevices', deviceId);
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, {
        brand: cleanMap.brand,
        model: cleanMap.model,
        os: cleanMap.os,
        chipset: cleanMap.chipset,
        ramGb: cleanMap.ramGb,
        storageGb: cleanMap.storageGb,
        screenInches: cleanMap.screenInches,
        resolution: cleanMap.resolution,
        refreshHz: cleanMap.refreshHz,
        touchSamplingHz: cleanMap.touchSamplingHz,
        tier: cleanMap.tier,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...cleanMap,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return deviceId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeCustomDevice(uid: string, deviceId: string): Promise<void> {
  const path = `users/${uid}/customDevices/${deviceId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'customDevices', deviceId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeAimLabRuns(
  uid: string,
  onData: (items: AimLabRun[]) => void
): Unsubscribe {
  const path = `users/${uid}/aimLabRuns`;
  const q = query(collection(db, 'users', uid, 'aimLabRuns'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: { sortMs: number; run: AimLabRun }[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        rows.push({
          sortMs: toTimestampMillis(d.createdAt),
          run: {
            id: docSnap.id,
            ownerId: String(d.ownerId),
            game: d.game === 'pubg-bgmi' ? 'pubg-bgmi' : 'free-fire',
            hits: Number(d.hits) || 0,
            misses: Number(d.misses) || 0,
            accuracy: Number(d.accuracy) || 0,
            avgReactionMs:
              typeof d.avgReactionMs === 'number' ? d.avgReactionMs : undefined,
            bestStreak: Number(d.bestStreak) || 0,
            scalar: Number(d.scalar) || 1,
            createdAt: toIsoString(d.createdAt),
          },
        });
      });
      rows.sort((a, b) => b.sortMs - a.sortMs);
      onData(rows.slice(0, 12).map((r) => r.run));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createAimLabRun(
  uid: string,
  params: {
    game: GameId;
    hits: number;
    misses: number;
    accuracy: number;
    avgReactionMs: number | null;
    bestStreak: number;
    scalar: number;
  }
): Promise<string> {
  const runId = sanitizeId(`run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, 'run');
  const path = `users/${uid}/aimLabRuns/${runId}`;
  const payload: Record<string, unknown> = {
    id: runId,
    ownerId: uid,
    game: params.game,
    hits: clampNumber(Math.round(params.hits), 0, 500),
    misses: clampNumber(Math.round(params.misses), 0, 500),
    accuracy: clampNumber(Math.round(params.accuracy), 0, 100),
    bestStreak: clampNumber(Math.round(params.bestStreak), 0, 500),
    scalar: clampNumber(Number(params.scalar.toFixed(2)), 0.5, 2.0),
    createdAt: serverTimestamp(),
  };
  if (typeof params.avgReactionMs === 'number' && Number.isFinite(params.avgReactionMs)) {
    payload.avgReactionMs = clampNumber(Math.round(params.avgReactionMs), 0, 15000);
  }
  try {
    await setDoc(doc(db, 'users', uid, 'aimLabRuns', runId), payload);
    return runId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeAimLabRun(uid: string, runId: string): Promise<void> {
  const path = `users/${uid}/aimLabRuns/${runId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'aimLabRuns', runId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribePublicPresets(
  onData: (items: ProPreset[]) => void
): Unsubscribe {
  const path = 'presets';
  const q = query(collection(db, 'presets'), where('visibility', '==', 'public'));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: { sortMs: number; preset: ProPreset }[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const device = hydrateDeviceProfile(
          {
            id: `preset-dev-${docSnap.id}`,
            brand: d.deviceBrand,
            model: d.deviceModel,
            chipset: d.deviceChipset,
            os: d.deviceOs,
            screenInches: d.deviceScreenInches,
            refreshHz: d.deviceRefreshHz,
            ramGb: d.deviceRamGb,
            storageGb: d.deviceStorageGb,
            resolution: d.deviceResolution,
            touchSamplingHz: 240,
            tier: 'Mid-Range',
          },
          docSnap.id
        );
        rows.push({
          sortMs: toTimestampMillis(d.createdAt),
          preset: {
            id: docSnap.id,
            authorId: String(d.authorId || ''),
            authorName: String(d.authorName || 'Player'),
            name: String(d.name || 'Untitled Preset'),
            playerArchetype: String(d.playerArchetype || 'Custom Loadout'),
            game: d.game === 'pubg-bgmi' ? 'pubg-bgmi' : 'free-fire',
            claw: d.claw,
            playstyle: d.playstyle,
            gyro: d.gyro,
            device,
            headlineMetric: String(d.headlineMetric || ''),
            description: String(d.description || ''),
            sliderOverrides: (d.sliders || {}) as Record<string, number>,
            createdAt: toIsoString(d.createdAt),
          },
        });
      });
      rows.sort((a, b) => b.sortMs - a.sortMs);
      onData(rows.map((r) => r.preset));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function publishPreset(
  user: User,
  params: {
    name: string;
    playerArchetype: string;
    description: string;
    headlineMetric: string;
    input: CalibrationInput;
    sliders: Record<string, number>;
  }
): Promise<string> {
  const presetId = sanitizeId(
    `preset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    'preset'
  );
  const path = `presets/${presetId}`;
  const cleanDevice = buildDeviceMap(params.input.device);
  const authorName = clampString(
    user.displayName || 'Player',
    BLUEPRINT_LIMITS.userDisplayNameMaxLength,
    'Player'
  );

  const payload = {
    id: presetId,
    authorId: user.uid,
    authorName,
    visibility: 'public',
    name: clampString(params.name, BLUEPRINT_LIMITS.presetNameMaxLength, 'Custom Preset'),
    playerArchetype: clampString(
      params.playerArchetype,
      BLUEPRINT_LIMITS.presetArchetypeMaxLength,
      'Custom Loadout'
    ),
    game: params.input.game,
    claw: params.input.claw,
    playstyle: params.input.playstyle,
    gyro: params.input.gyro,
    deviceBrand: cleanDevice.brand,
    deviceModel: cleanDevice.model,
    deviceChipset: cleanDevice.chipset,
    deviceOs: cleanDevice.os,
    deviceScreenInches: cleanDevice.screenInches,
    deviceRefreshHz: cleanDevice.refreshHz,
    deviceRamGb: cleanDevice.ramGb,
    deviceStorageGb: cleanDevice.storageGb,
    deviceResolution: cleanDevice.resolution,
    headlineMetric: clampString(
      params.headlineMetric,
      BLUEPRINT_LIMITS.presetHeadlineMaxLength,
      'Calibrated Profile'
    ),
    description: clampString(
      params.description,
      BLUEPRINT_LIMITS.presetDescriptionMaxLength,
      'Player-calibrated sensitivity configuration.'
    ),
    sliders: params.sliders,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'presets', presetId), payload);
    return presetId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removePreset(presetId: string): Promise<void> {
  const path = `presets/${presetId}`;
  try {
    await deleteDoc(doc(db, 'presets', presetId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

