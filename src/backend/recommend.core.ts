/**
 * Server-side recommendation pipeline shared by the public and signed-in server functions.
 * Reads catalog + game structure + measurements by id, runs the engines, and returns a
 * Recommendation. Only called from server function handlers (no secrets at module scope).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { buildRecommendation, normalizeDevice, RecommendationError, type Recommendation } from '../engine/recommend';
import { assembleGameRecord } from '../engine/sensitivity';
import { parseModelConfig, SETTING_DB_KEY, SETTING_KEYS, type ModelConfig, type SettingKey } from '../engine/freefire/config';
import { analyzeFreeFire, supportsFreeFireEngine } from '../engine/freefire/analyze';
import type { DeviceMeasurements } from '../engine/freefire/device';
import type { PlayerProfile } from '../engine/freefire/player';
import type { CalibrationSession } from '../engine/freefire/calibration';
import type { FeedbackEvent } from '../engine/freefire/feedback';

export type Db = SupabaseClient<Database>;
export type RecommendationResponse = { ok: true; recommendation: Recommendation } | { ok: false; error: string };

export const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function validateIds(input: { deviceId: string; gameId: string }) {
  const deviceId = String(input?.deviceId ?? '');
  const gameId = String(input?.gameId ?? '');
  if (!ID.test(deviceId)) throw new Error('Choose a phone first.');
  if (!ID.test(gameId)) throw new Error('Choose a game first.');
  return { deviceId, gameId };
}

/** Publishable-key client for public catalog reads (opaque sb_ keys need the apikey shim). */
export function publicClient(): Db | null {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  const url = process.env['SUPABASE_URL'];
  if (!key || !url) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith('sb_') && h.get('Authorization') === `Bearer ${key}`) h.delete('Authorization');
        h.set('apikey', key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Personal data for one player (signed-in only). */
export interface PersonalData {
  player: PlayerProfile | null;
  calibration: Partial<Record<SettingKey, CalibrationSession[]>>;
  feedback: FeedbackEvent[];
}

export interface ComputedRecommendation {
  recommendation: Recommendation;
  /** Present when the Free Fire hybrid engine ran. */
  ff?: { cfg: ModelConfig; gameVersion: string | null };
}

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN);

export async function computeRecommendation(
  db: Db,
  ids: { deviceId: string; gameId: string },
  personal?: (ctx: { cfg: ModelConfig; deviceId: string; gameId: string; settingIds: Record<SettingKey, string> }) => Promise<PersonalData>,
  opts: { baseOnly?: boolean } = {}
): Promise<{ ok: true; value: ComputedRecommendation } | { ok: false; error: string }> {
  const [deviceRes, gameRes] = await Promise.all([
    db.from('devices').select('id, data').eq('id', ids.deviceId).maybeSingle(),
    db
      .from('games')
      .select('id, name, short_name, publisher, supports_gyro, sensitivity_schema_id, config, current_version')
      .eq('id', ids.gameId)
      .maybeSingle(),
  ]);
  if (deviceRes.error || gameRes.error) {
    console.error('recommendation read failed', deviceRes.error?.message, gameRes.error?.message);
    return { ok: false, error: 'Could not reach the database. Please try again.' };
  }
  if (!deviceRes.data) return { ok: false, error: 'This phone is not in the catalog.' };
  if (!gameRes.data) return { ok: false, error: 'This game is not supported.' };
  const game = gameRes.data;
  const schemaId = game.sensitivity_schema_id;
  if (!schemaId) return { ok: false, error: `${game.name} has no sensitivity setup yet.` };

  const raw: Record<string, unknown> = { ...((deviceRes.data.data ?? {}) as Record<string, unknown>), id: deviceRes.data.id };
  const chipsetId = typeof raw.chipsetId === 'string' ? raw.chipsetId : null;
  const [schemaRes, catRes, setRes, profRes, chipRes, modelRes] = await Promise.all([
    db.from('sensitivity_schemas').select('id, name, unit').eq('id', schemaId).maybeSingle(),
    db.from('sensitivity_categories').select('id, schema_id, label, description, display_order, requires_gyro').eq('schema_id', schemaId),
    db
      .from('sensitivity_settings')
      .select('id, schema_id, category_id, key, label, description, min_value, max_value, display_order, input_kind, core_slot')
      .eq('schema_id', schemaId),
    db.from('game_sensitivity_profiles').select('game_id, schema_id, setting_id, recommended_value').eq('game_id', game.id),
    chipsetId ? db.from('chipsets').select('data').eq('id', chipsetId).maybeSingle() : Promise.resolve(null),
    db.from('model_versions').select('id, configuration').eq('game_id', game.id).eq('is_active', true).maybeSingle(),
  ]);
  const readError = schemaRes.error ?? catRes.error ?? setRes.error ?? profRes.error ?? modelRes.error;
  if (readError) {
    console.error('recommendation sensitivity read failed', readError.message);
    return { ok: false, error: 'Could not reach the database. Please try again.' };
  }
  const chipset = (chipRes?.data?.data as Record<string, unknown>) ?? null;

  try {
    const { game: record, issues } = assembleGameRecord({
      game,
      schema: schemaRes.data,
      categories: catRes.data ?? [],
      settings: setRes.data ?? [],
      profiles: profRes.data ?? [],
    });
    if (issues.length) console.warn('recommendation ignored rows', game.id, issues);
    const device = normalizeDevice(raw, chipset);
    const rec = buildRecommendation(device, record);

    // Games without an active hybrid model keep the existing starting-value engine.
    if (!modelRes.data || opts.baseOnly) return { ok: true, value: { recommendation: rec } };
    const cfg = parseModelConfig(modelRes.data.configuration);
    if (cfg.modelName && `${cfg.modelName}@${cfg.version}` !== modelRes.data.id) throw new Error('model version id mismatch');
    if (!supportsFreeFireEngine(cfg, game.id)) return { ok: true, value: { recommendation: rec } };

    const [benchRes, touchRes, runtimeRes] = await Promise.all([
      db
        .from('component_benchmarks')
        .select('device_id, chipset_id, benchmark_name, single_core_score, multi_core_score, gpu_score, data_status, source, test_date')
        .or(chipsetId ? `device_id.eq.${ids.deviceId},chipset_id.eq.${chipsetId}` : `device_id.eq.${ids.deviceId}`),
      db
        .from('touch_profiles')
        .select('touch_latency_ms, touch_sampling_rate_hz, input_consistency_ms, controller_quality, firmware, data_status, source, measured_at')
        .eq('device_id', ids.deviceId),
      db
        .from('runtime_profiles')
        .select('game_version, graphics_setting, fps_cap, average_fps, one_percent_low, frame_stability, thermal_state, data_status, source, measurement_date')
        .eq('device_id', ids.deviceId)
        .eq('game_id', game.id),
    ]);
    const mErr = benchRes.error ?? touchRes.error ?? runtimeRes.error;
    if (mErr) {
      console.error('measurement read failed', mErr.message);
      return { ok: false, error: 'Could not reach the database. Please try again.' };
    }
    const measurements: DeviceMeasurements = {
      benchmarks: (benchRes.data ?? []).map((b) => ({ ...b, single_core_score: b.single_core_score === null ? null : num(b.single_core_score), multi_core_score: b.multi_core_score === null ? null : num(b.multi_core_score), gpu_score: b.gpu_score === null ? null : num(b.gpu_score) })),
      touchProfiles: touchRes.data ?? [],
      runtimeProfiles: runtimeRes.data ?? [],
    };

    const settingIds = Object.fromEntries(
      SETTING_KEYS.map((k) => [k, record.config.settings.find((s) => s.key === SETTING_DB_KEY[k])?.id ?? ''])
    ) as Record<SettingKey, string>;
    const p = personal ? await personal({ cfg, deviceId: ids.deviceId, gameId: game.id, settingIds }) : null;

    const analysis = analyzeFreeFire({
      cfg,
      game: record,
      device,
      measurements,
      player: p?.player ?? null,
      calibration: p?.calibration ?? {},
      feedback: p?.feedback ?? [],
      gameVersion: game.current_version,
    });

    // Replace the six values with the hybrid engine's suggestions.
    const byDbKey = new Map(analysis.settings.map((s) => [SETTING_DB_KEY[s.key], s]));
    const coreKey: Record<string, SettingKey> = { general: 'general', redDot: 'redDot', scope2x: 'scope2x', scope4x: 'scope4x', sniper: 'sniper', freeLook: 'freeLook' };
    const recommendation: Recommendation = {
      ...rec,
      groups: rec.groups.map((g) => ({
        ...g,
        settings: g.settings.map((s) => ({ ...s, value: byDbKey.get(s.key)?.suggested ?? s.value })),
      })),
      core: rec.core.map((c) => ({ ...c, value: analysis.settings.find((s) => s.key === coreKey[c.id])?.suggested ?? c.value })),
      basis: [
        `${device.display.sizeInches}" display`,
        `${device.display.refreshHz} Hz refresh rate`,
        analysis.player === 'none' ? 'no play-style answers yet' : 'your play-style answers',
      ],
      analysis,
    };
    return { ok: true, value: { recommendation, ff: { cfg, gameVersion: game.current_version } } };
  } catch (err) {
    if (err instanceof RecommendationError) return { ok: false, error: err.message };
    console.error('recommendation failed', err);
    return { ok: false, error: 'Something went wrong while generating settings.' };
  }
}
