import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  AimLabRun,
  CalibrationInput,
  DeviceProfile,
  GameId,
  ProPreset,
  SavedSetup,
} from '../engine/types';
import { handleBackendError, OperationType } from './errors';
import type { AppUser } from './user';
import { FIELD_LIMITS, clampNumber, clampString, sanitizeId } from './validation';

export type Unsubscribe = () => void;

// --- Tiny change bus: lets list subscribers refetch after this client writes. ---
type Channel = 'saved_setups' | 'custom_devices' | 'aim_lab_runs' | 'presets';
const listeners = new Map<Channel, Set<() => void>>();

function listen(channel: Channel, fn: () => void): Unsubscribe {
  const set = listeners.get(channel) ?? new Set();
  set.add(fn);
  listeners.set(channel, set);
  return () => set.delete(fn);
}

function notify(channel: Channel) {
  listeners.get(channel)?.forEach((fn) => fn());
}

function subscribeList<T>(
  channel: Channel,
  load: () => Promise<T[]>,
  onData: (items: T[]) => void,
  path: string
): Unsubscribe {
  let active = true;
  const run = () => {
    load()
      .then((items) => {
        if (active) onData(items);
      })
      .catch((error) => {
        console.error(`Failed to load ${path}`, error);
      });
  };
  run();
  const off = listen(channel, run);
  return () => {
    active = false;
    off();
  };
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
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
    brand: clampString(device.brand, FIELD_LIMITS.deviceBrandMaxLength, 'Device'),
    model: clampString(device.model, FIELD_LIMITS.deviceModelMaxLength, 'Unknown'),
    os,
    chipset: clampString(device.chipset, FIELD_LIMITS.deviceChipsetMaxLength, 'Mobile SoC'),
    ramGb: clampNumber(Math.round(device.ramGb), 1, 64),
    storageGb: clampNumber(Math.round(device.storageGb), 16, 4096),
    screenInches: clampNumber(Number(device.screenInches.toFixed(2)), 4.5, 14.0),
    resolution: clampString(
      device.resolution,
      FIELD_LIMITS.deviceResolutionMaxLength,
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

function toGame(value: unknown): GameId {
  return value === 'pubg-bgmi' ? 'pubg-bgmi' : 'free-fire';
}

export async function checkIsAdmin(uid: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', { _user_id: uid, _role: 'admin' });
  if (error) return false;
  return Boolean(data);
}

// --- Saved setups ---

export function subscribeSavedSetups(
  uid: string,
  onData: (items: SavedSetup[]) => void
): Unsubscribe {
  return subscribeList(
    'saved_setups',
    async () => {
      const { data, error } = await supabase
        .from('saved_setups')
        .select('*')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false });
      if (error) handleBackendError(error, OperationType.LIST, 'saved_setups');
      return (data ?? []).map((row) => {
        const d = (row.input ?? {}) as Record<string, unknown>;
        const device = hydrateDeviceProfile(
          (d.device || {}) as Record<string, unknown>,
          row.id
        );
        const setup: SavedSetup = {
          id: row.id,
          name: row.name || 'Saved Setup',
          createdAt: row.created_at,
          input: {
            game: toGame(row.game),
            device,
            claw: d.claw as CalibrationInput['claw'],
            playstyle: d.playstyle as CalibrationInput['playstyle'],
            gyro: d.gyro as CalibrationInput['gyro'],
            preferredFps: String(d.preferredFps || '60 FPS'),
            fireButtonSize: typeof d.fireButtonSize === 'number' ? d.fireButtonSize : undefined,
            dpiOverride: typeof d.dpiOverride === 'string' ? d.dpiOverride : undefined,
            cameraPref: d.cameraPref as CalibrationInput['cameraPref'],
            currentSensitivity:
              typeof d.currentSensitivity === 'string' ? d.currentSensitivity : undefined,
          },
          sliders: (row.sliders || {}) as Record<string, number>,
        };
        return setup;
      });
    },
    onData,
    'saved setups'
  );
}

export async function createSavedSetup(
  uid: string,
  name: string,
  input: CalibrationInput,
  sliders: Record<string, number>
): Promise<string> {
  const cleanName = clampString(
    name,
    FIELD_LIMITS.setupNameMaxLength,
    `${input.device.brand} ${input.device.model}`
  );
  const payload: Record<string, unknown> = {
    device: buildDeviceMap(input.device),
    claw: input.claw,
    playstyle: input.playstyle,
    gyro: input.gyro,
    preferredFps: clampString(input.preferredFps, FIELD_LIMITS.preferredFpsMaxLength, '60 FPS'),
  };
  if (typeof input.fireButtonSize === 'number') {
    payload.fireButtonSize = clampNumber(Math.round(input.fireButtonSize), 30, 80);
  }
  if (input.dpiOverride && input.dpiOverride.trim()) {
    payload.dpiOverride = clampString(input.dpiOverride, FIELD_LIMITS.dpiOverrideMaxLength);
  }
  if (input.cameraPref) payload.cameraPref = input.cameraPref;
  if (input.currentSensitivity && input.currentSensitivity.trim()) {
    payload.currentSensitivity = clampString(
      input.currentSensitivity,
      FIELD_LIMITS.currentSensitivityMaxLength
    );
  }

  const { data, error } = await supabase
    .from('saved_setups')
    .insert({
      owner_id: uid,
      name: cleanName,
      game: input.game,
      input: asJson(payload),
      sliders: asJson(sliders),
    })
    .select('id')
    .single();
  if (error) handleBackendError(error, OperationType.CREATE, 'saved_setups');
  notify('saved_setups');
  return data.id;
}

export async function removeSavedSetup(uid: string, setupId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_setups')
    .delete()
    .eq('owner_id', uid)
    .eq('id', setupId);
  if (error) handleBackendError(error, OperationType.DELETE, 'saved_setups');
  notify('saved_setups');
}

// --- Custom devices ---

export function subscribeCustomDevices(
  uid: string,
  onData: (items: DeviceProfile[]) => void
): Unsubscribe {
  return subscribeList(
    'custom_devices',
    async () => {
      const { data, error } = await supabase
        .from('custom_devices')
        .select('*')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false });
      if (error) handleBackendError(error, OperationType.LIST, 'custom_devices');
      return (data ?? []).map((row) =>
        hydrateDeviceProfile({ ...((row.device ?? {}) as Record<string, unknown>), id: row.id }, row.id)
      );
    },
    onData,
    'custom devices'
  );
}

export async function saveCustomDevice(uid: string, device: DeviceProfile): Promise<string> {
  const baseSlug = sanitizeId(`${device.brand}-${device.model}`, 'device').toLowerCase();
  const deviceId =
    device.id && !['manual-device', 'custom-device'].includes(device.id)
      ? sanitizeId(device.id, 'device')
      : `${baseSlug}-${Date.now().toString(36)}`;
  const cleanMap = buildDeviceMap({ ...device, id: deviceId });

  const { error } = await supabase
    .from('custom_devices')
    .upsert({ owner_id: uid, id: deviceId, device: asJson(cleanMap) }, { onConflict: 'owner_id,id' });
  if (error) handleBackendError(error, OperationType.WRITE, 'custom_devices');
  notify('custom_devices');
  return deviceId;
}

export async function removeCustomDevice(uid: string, deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('custom_devices')
    .delete()
    .eq('owner_id', uid)
    .eq('id', deviceId);
  if (error) handleBackendError(error, OperationType.DELETE, 'custom_devices');
  notify('custom_devices');
}

// --- Aim lab runs ---

export function subscribeAimLabRuns(
  uid: string,
  onData: (items: AimLabRun[]) => void
): Unsubscribe {
  return subscribeList(
    'aim_lab_runs',
    async () => {
      const { data, error } = await supabase
        .from('aim_lab_runs')
        .select('*')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) handleBackendError(error, OperationType.LIST, 'aim_lab_runs');
      return (data ?? []).map(
        (row): AimLabRun => ({
          id: row.id,
          ownerId: row.owner_id,
          game: toGame(row.game),
          hits: row.hits,
          misses: row.misses,
          accuracy: row.accuracy,
          avgReactionMs: row.avg_reaction_ms ?? undefined,
          bestStreak: row.best_streak,
          scalar: Number(row.scalar) || 1,
          createdAt: row.created_at,
        })
      );
    },
    onData,
    'aim lab runs'
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
  const { data, error } = await supabase
    .from('aim_lab_runs')
    .insert({
      owner_id: uid,
      game: params.game,
      hits: clampNumber(Math.round(params.hits), 0, 500),
      misses: clampNumber(Math.round(params.misses), 0, 500),
      accuracy: clampNumber(Math.round(params.accuracy), 0, 100),
      best_streak: clampNumber(Math.round(params.bestStreak), 0, 500),
      scalar: clampNumber(Number(params.scalar.toFixed(2)), 0.5, 2.0),
      avg_reaction_ms:
        typeof params.avgReactionMs === 'number' && Number.isFinite(params.avgReactionMs)
          ? clampNumber(Math.round(params.avgReactionMs), 0, 15000)
          : null,
    })
    .select('id')
    .single();
  if (error) handleBackendError(error, OperationType.CREATE, 'aim_lab_runs');
  notify('aim_lab_runs');
  return data.id;
}

export async function removeAimLabRun(uid: string, runId: string): Promise<void> {
  const { error } = await supabase
    .from('aim_lab_runs')
    .delete()
    .eq('owner_id', uid)
    .eq('id', runId);
  if (error) handleBackendError(error, OperationType.DELETE, 'aim_lab_runs');
  notify('aim_lab_runs');
}

// --- Community presets ---

export function subscribePublicPresets(onData: (items: ProPreset[]) => void): Unsubscribe {
  return subscribeList(
    'presets',
    async () => {
      const { data, error } = await supabase
        .from('presets')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
      if (error) handleBackendError(error, OperationType.LIST, 'presets');
      return (data ?? []).map((row): ProPreset => {
        const dev = (row.device ?? {}) as Record<string, unknown>;
        return {
          id: row.id,
          authorId: row.author_id,
          authorName: row.author_name || 'Player',
          name: row.name || 'Untitled Preset',
          playerArchetype: row.player_archetype || 'Custom Loadout',
          game: toGame(row.game),
          claw: row.claw as ProPreset['claw'],
          playstyle: row.playstyle as ProPreset['playstyle'],
          gyro: row.gyro as ProPreset['gyro'],
          device: hydrateDeviceProfile(
            { ...dev, id: `preset-dev-${row.id}`, touchSamplingHz: 240, tier: 'Mid-Range' },
            row.id
          ),
          headlineMetric: row.headline_metric || '',
          description: row.description || '',
          sliderOverrides: (row.sliders || {}) as Record<string, number>,
          createdAt: row.created_at,
        };
      });
    },
    onData,
    'presets'
  );
}

export async function publishPreset(
  user: AppUser,
  params: {
    name: string;
    playerArchetype: string;
    description: string;
    headlineMetric: string;
    input: CalibrationInput;
    sliders: Record<string, number>;
  }
): Promise<string> {
  const cleanDevice = buildDeviceMap(params.input.device);
  const { data, error } = await supabase
    .from('presets')
    .insert({
      author_id: user.uid,
      author_name: clampString(
        user.displayName || 'Player',
        FIELD_LIMITS.userDisplayNameMaxLength,
        'Player'
      ),
      visibility: 'public',
      name: clampString(params.name, FIELD_LIMITS.presetNameMaxLength, 'Custom Preset'),
      player_archetype: clampString(
        params.playerArchetype,
        FIELD_LIMITS.presetArchetypeMaxLength,
        'Custom Loadout'
      ),
      game: params.input.game,
      claw: params.input.claw,
      playstyle: params.input.playstyle,
      gyro: params.input.gyro,
      device: asJson({
        brand: cleanDevice.brand,
        model: cleanDevice.model,
        chipset: cleanDevice.chipset,
        os: cleanDevice.os,
        screenInches: cleanDevice.screenInches,
        refreshHz: cleanDevice.refreshHz,
        ramGb: cleanDevice.ramGb,
        storageGb: cleanDevice.storageGb,
        resolution: cleanDevice.resolution,
      }),
      headline_metric: clampString(
        params.headlineMetric,
        FIELD_LIMITS.presetHeadlineMaxLength,
        'Calibrated Profile'
      ),
      description: clampString(
        params.description,
        FIELD_LIMITS.presetDescriptionMaxLength,
        'Player-calibrated sensitivity configuration.'
      ),
      sliders: asJson(params.sliders),
    })
    .select('id')
    .single();
  if (error) handleBackendError(error, OperationType.CREATE, 'presets');
  notify('presets');
  return data.id;
}

export async function removePreset(presetId: string): Promise<void> {
  const { error } = await supabase.from('presets').delete().eq('id', presetId);
  if (error) handleBackendError(error, OperationType.DELETE, 'presets');
  notify('presets');
}
