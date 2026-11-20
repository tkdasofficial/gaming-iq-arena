import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Json } from '@/integrations/supabase/types';
import { computeRecommendation, validateIds, ID, type RecommendationResponse } from './recommend.core';
import { parseModelConfig, SETTING_DB_KEY, SETTING_KEYS, STALE_KEYS, type SettingKey, type StaleKey } from '../engine/freefire/config';
import { sanitizePlayerProfile, type PlayerProfile } from '../engine/freefire/player';
import { applyFeedback, FEEDBACK_TYPES, type FeedbackType } from '../engine/freefire/feedback';
import { computeValidationMetrics, type ValidationMetrics } from '../engine/freefire/metrics';
import type { CalibrationSession } from '../engine/freefire/calibration';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

type PlayerRow = {
  finger_count: number | null; hud_layout: string | null; fire_button_size: number | null; fire_button_position: string | null;
  swipe_length: string | null; swipe_speed: string | null; play_style: string | null; weapon_preference: string | null;
  drag_technique: string | null; gyro_status: string | null; comfort_preference: string | null; uses_free_look: boolean | null;
};
const PLAYER_COLS = 'finger_count, hud_layout, fire_button_size, fire_button_position, swipe_length, swipe_speed, play_style, weapon_preference, drag_technique, gyro_status, comfort_preference, uses_free_look';

const fromRow = (r: PlayerRow | null): PlayerProfile | null =>
  r
    ? sanitizePlayerProfile({
        fingerCount: r.finger_count, hudLayout: r.hud_layout, fireButtonSize: r.fire_button_size, fireButtonPosition: r.fire_button_position,
        swipeLength: r.swipe_length, swipeSpeed: r.swipe_speed, playStyle: r.play_style, weaponPreference: r.weapon_preference,
        dragTechnique: r.drag_technique, gyroStatus: r.gyro_status, comfortPreference: r.comfort_preference, usesFreeLook: r.uses_free_look,
      })
    : null;
const toRow = (p: PlayerProfile): PlayerRow => ({
  finger_count: p.fingerCount, hud_layout: p.hudLayout, fire_button_size: p.fireButtonSize, fire_button_position: p.fireButtonPosition,
  swipe_length: p.swipeLength, swipe_speed: p.swipeSpeed, play_style: p.playStyle, weapon_preference: p.weaponPreference,
  drag_technique: p.dragTechnique, gyro_status: p.gyroStatus, comfort_preference: p.comfortPreference, uses_free_look: p.usesFreeLook,
});
const settingKeyOf = (settingId: string): SettingKey | null => SETTING_KEYS.find((k) => settingId.endsWith(`.${SETTING_DB_KEY[k]}`)) ?? null;

// ---------- player profile ----------

export const getPlayerProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { gameId: string }) => {
    if (!ID.test(String(input?.gameId ?? ''))) throw new Error('Choose a game first.');
    return { gameId: String(input.gameId) };
  })
  .handler(async ({ data, context }): Promise<PlayerProfile | null> => {
    const { data: row, error } = await context.supabase
      .from('player_profiles')
      .select(PLAYER_COLS)
      .eq('user_id', context.userId)
      .eq('game_id', data.gameId)
      .maybeSingle();
    if (error) throw new Error('Could not load your answers.');
    return fromRow(row as PlayerRow | null);
  });

export const savePlayerProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { gameId: string; profile: unknown }) => {
    if (!ID.test(String(input?.gameId ?? ''))) throw new Error('Choose a game first.');
    return { gameId: String(input.gameId), profile: sanitizePlayerProfile(input?.profile) };
  })
  .handler(async ({ data, context }): Promise<PlayerProfile> => {
    const { error } = await context.supabase
      .from('player_profiles')
      .upsert({ user_id: context.userId, game_id: data.gameId, ...toRow(data.profile) }, { onConflict: 'user_id,game_id' });
    if (error) {
      console.error('savePlayerProfile failed', error.message);
      throw new Error('Could not save your answers.');
    }
    return data.profile;
  });

// ---------- personal recommendation (stores history) ----------

export const generatePersonalRecommendation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateIds)
  .handler(async ({ data, context }): Promise<RecommendationResponse> => {
    const db = context.supabase;
    const uid = context.userId;
    const res = await computeRecommendation(db, data, async ({ deviceId, gameId, settingIds }) => {
      const keyById = new Map(SETTING_KEYS.map((k) => [settingIds[k], k] as const));
      const [pRes, cRes, fRes] = await Promise.all([
        db.from('player_profiles').select(PLAYER_COLS).eq('user_id', uid).eq('game_id', gameId).maybeSingle(),
        db
          .from('calibration_sessions')
          .select('id, created_at, setting_id, game_version, conditions, calibration_runs(slider_value, repetition_number, target_movement, measured_movement, overshoot, undershoot, instability, time_to_target_ms)')
          .eq('user_id', uid)
          .eq('device_id', deviceId)
          .eq('game_id', gameId)
          .order('created_at', { ascending: false })
          .limit(100),
        db
          .from('feedback_events')
          .select('setting_id, previous_value, new_value, feedback_type, created_at')
          .eq('user_id', uid)
          .eq('device_id', deviceId)
          .eq('game_id', gameId)
          .order('created_at', { ascending: false })
          .limit(500),
      ]);
      if (pRes.error || cRes.error || fRes.error) console.error('personal data read failed', pRes.error?.message, cRes.error?.message, fRes.error?.message);
      const calibration: Partial<Record<SettingKey, CalibrationSession[]>> = {};
      for (const s of cRes.data ?? []) {
        const key = keyById.get(s.setting_id);
        if (!key) continue;
        const cond = (s.conditions ?? {}) as Record<string, unknown>;
        const conditions: CalibrationSession['conditions'] = { gameVersion: s.game_version };
        for (const k of STALE_KEYS) if (k !== 'gameVersion' && (typeof cond[k] === 'string' || typeof cond[k] === 'number')) conditions[k] = cond[k] as string | number;
        (calibration[key] ??= []).push({
          id: s.id,
          createdAt: s.created_at,
          conditions,
          runs: (s.calibration_runs ?? []).map((r) => ({
            sliderValue: Number(r.slider_value),
            repetition: r.repetition_number,
            targetMovement: Number(r.target_movement),
            measuredMovement: Number(r.measured_movement),
            overshoot: n(r.overshoot),
            undershoot: n(r.undershoot),
            instability: n(r.instability),
            timeToTargetMs: n(r.time_to_target_ms),
          })),
        });
      }
      const feedback = (fRes.data ?? []).flatMap((f) => {
        const key = keyById.get(f.setting_id);
        return key ? [{ settingKey: key, previousValue: Number(f.previous_value), newValue: Number(f.new_value), type: f.feedback_type as FeedbackType, createdAt: f.created_at }] : [];
      });
      return { player: fromRow((pRes.data as PlayerRow | null) ?? null), calibration, feedback };
    });
    if (!res.ok) return res;
    const { recommendation, ff } = res.value;
    const analysis = recommendation.analysis;
    if (!ff || !analysis) return { ok: true, recommendation };

    // History is written by the server (service role) after computing; players can't insert their own.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const generationId = crypto.randomUUID();
    const rows = analysis.settings.map((s) => ({
      generation_id: generationId,
      user_id: uid,
      device_id: data.deviceId,
      game_id: data.gameId,
      game_version: ff.gameVersion,
      setting_id: s.settingId,
      recommended_min: s.min,
      recommended_max: s.max,
      suggested_value: s.suggested,
      confidence: s.confidence,
      confidence_score: s.confidenceScore,
      data_completeness: s.dataCompleteness,
      calibration_status: s.calibrationStatus,
      value_source: s.source,
      pi_score: analysis.pi.score,
      tdi_score: analysis.tdi.score,
      factors: s.factors as unknown as Json,
      model_version_id: analysis.modelVersionId,
    }));
    const { data: inserted, error } = await supabaseAdmin.from('recommendations').insert(rows).select('id, setting_id');
    if (error) {
      console.error('recommendation history insert failed', error.message);
      return { ok: true, recommendation };
    }
    const ids: Partial<Record<SettingKey, string>> = {};
    for (const r of inserted ?? []) {
      const k = settingKeyOf(r.setting_id);
      if (k) ids[k] = r.id;
    }
    return { ok: true, recommendation: { ...recommendation, analysis: { ...analysis, recommendationIds: ids } } };
  });

// ---------- feedback (adjusts one setting only) ----------

export type FeedbackResponse = { ok: true; settingKey: SettingKey; previousValue: number; newValue: number } | { ok: false; error: string };

export const submitFeedback = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { recommendationId: string; feedbackType: string }) => {
    const recommendationId = String(input?.recommendationId ?? '');
    const feedbackType = String(input?.feedbackType ?? '') as FeedbackType;
    if (!UUID.test(recommendationId)) throw new Error('Unknown result.');
    if (!FEEDBACK_TYPES.includes(feedbackType)) throw new Error('Unknown feedback.');
    return { recommendationId, feedbackType };
  })
  .handler(async ({ data, context }): Promise<FeedbackResponse> => {
    // RLS: only the owner can read this recommendation.
    const { data: rec, error } = await context.supabase
      .from('recommendations')
      .select('id, user_id, device_id, game_id, game_version, setting_id, suggested_value, model_version_id')
      .eq('id', data.recommendationId)
      .maybeSingle();
    if (error || !rec || rec.user_id !== context.userId) return { ok: false, error: 'This result is not available.' };
    const key = settingKeyOf(rec.setting_id);
    if (!key) return { ok: false, error: 'This setting does not take feedback.' };
    const [modelRes, lastRes] = await Promise.all([
      context.supabase.from('model_versions').select('configuration').eq('id', rec.model_version_id).maybeSingle(),
      context.supabase.from('feedback_events').select('new_value').eq('recommendation_id', rec.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (modelRes.error || !modelRes.data) return { ok: false, error: 'Could not record feedback right now.' };
    const cfg = parseModelConfig(modelRes.data.configuration);
    const previousValue = lastRes.data ? Number(lastRes.data.new_value) : Number(rec.suggested_value);
    const newValue = applyFeedback(previousValue, data.feedbackType, key, cfg);

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const ins = await supabaseAdmin.from('feedback_events').insert({
      user_id: context.userId,
      recommendation_id: rec.id,
      device_id: rec.device_id,
      game_id: rec.game_id,
      game_version: rec.game_version,
      setting_id: rec.setting_id,
      previous_value: previousValue,
      new_value: newValue,
      feedback_type: data.feedbackType,
    });
    if (ins.error) {
      console.error('feedback insert failed', ins.error.message);
      return { ok: false, error: 'Could not record feedback right now.' };
    }
    return { ok: true, settingKey: key, previousValue, newValue };
  });

// ---------- calibration (stored atomically; no test screen yet) ----------

interface RunInput {
  sliderValue: number; repetition: number; swipeDirection?: string | null; targetMovement: number; measuredMovement: number;
  overshoot?: number | null; undershoot?: number | null; instability?: number | null; timeToTargetMs?: number | null;
  deviceTemperatureC?: number | null; batteryPercent?: number | null;
}

export const recordCalibrationSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { deviceId: string; gameId: string; settingKey: string; gameVersion?: string | null; swipeDistanceMm?: number | null; conditions?: Record<string, unknown>; runs: RunInput[] }) => {
    const { deviceId, gameId } = validateIds(input);
    const settingKey = input?.settingKey as SettingKey;
    if (!SETTING_KEYS.includes(settingKey)) throw new Error('Unknown setting.');
    const runs = Array.isArray(input?.runs) ? input.runs : [];
    if (runs.length < 1 || runs.length > 200) throw new Error('Add between 1 and 200 test results.');
    const fin = (v: unknown, min: number, max: number, label: string, optional = false) => {
      if (optional && (v === null || v === undefined)) return null;
      if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error(`${label} must be between ${min} and ${max}.`);
      return v;
    };
    const clean = runs.map((r) => ({
      slider_value: fin(r.sliderValue, 0, 1000, 'Slider value'),
      repetition_number: fin(r.repetition, 1, 50, 'Repetition'),
      swipe_direction: ['left', 'right', 'up', 'down'].includes(String(r.swipeDirection)) ? String(r.swipeDirection) : null,
      target_movement: fin(r.targetMovement, 0.0001, 1e6, 'Target movement'),
      measured_movement: fin(r.measuredMovement, 0, 1e6, 'Measured movement'),
      overshoot: fin(r.overshoot, 0, 1e6, 'Overshoot', true),
      undershoot: fin(r.undershoot, 0, 1e6, 'Undershoot', true),
      instability: fin(r.instability, 0, 1e6, 'Instability', true),
      time_to_target_ms: fin(r.timeToTargetMs, 0, 600000, 'Time to target', true),
      device_temperature_c: fin(r.deviceTemperatureC, -20, 80, 'Temperature', true),
      battery_percent: fin(r.batteryPercent, 0, 100, 'Battery', true),
    }));
    const conditions: Partial<Record<StaleKey, string | number>> = {};
    for (const k of STALE_KEYS) {
      const v = input?.conditions?.[k];
      if (k !== 'gameVersion' && (typeof v === 'string' || typeof v === 'number')) conditions[k] = typeof v === 'string' ? v.slice(0, 60) : v;
    }
    const gameVersion = typeof input?.gameVersion === 'string' ? input.gameVersion.slice(0, 40) : null;
    const swipeDistanceMm = fin(input?.swipeDistanceMm ?? null, 1, 200, 'Swipe distance', true);
    return { deviceId, gameId, settingKey, gameVersion, swipeDistanceMm, conditions, runs: clean };
  })
  .handler(async ({ data, context }): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> => {
    const { data: game } = await context.supabase.from('games').select('sensitivity_schema_id').eq('id', data.gameId).maybeSingle();
    if (!game?.sensitivity_schema_id) return { ok: false, error: 'This game is not supported.' };
    const { data: setting } = await context.supabase
      .from('sensitivity_settings')
      .select('id')
      .eq('schema_id', game.sensitivity_schema_id)
      .eq('key', SETTING_DB_KEY[data.settingKey])
      .maybeSingle();
    if (!setting) return { ok: false, error: 'This setting is not part of the game.' };
    const { data: sessionId, error } = await context.supabase.rpc('record_calibration_session', {
      _device_id: data.deviceId,
      _game_id: data.gameId,
      _setting_id: setting.id,
      _game_version: data.gameVersion as string,
      _swipe_distance_mm: data.swipeDistanceMm as number,
      _conditions: data.conditions as Json,
      _runs: data.runs as unknown as Json,
    });
    if (error || !sessionId) {
      console.error('calibration insert failed', error?.message);
      return { ok: false, error: 'Could not save these test results.' };
    }
    return { ok: true, sessionId };
  });

// ---------- validation metrics (admins only) ----------

export const getValidationMetrics = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; metrics: ValidationMetrics; modelVersionId: string } | { ok: false; error: string }> => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (!isAdmin) return { ok: false, error: 'Forbidden' };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const model = await supabaseAdmin.from('model_versions').select('id, configuration').eq('game_id', 'free-fire').eq('is_active', true).maybeSingle();
    if (!model.data) return { ok: false, error: 'No active model.' };
    const cfg = parseModelConfig(model.data.configuration);
    const [recs, fb, sessions] = await Promise.all([
      supabaseAdmin.from('recommendations').select('id, user_id, device_id, setting_id, suggested_value, confidence, data_completeness, created_at').eq('model_version_id', model.data.id).limit(10000),
      supabaseAdmin.from('feedback_events').select('recommendation_id, previous_value, new_value, feedback_type, created_at').limit(50000),
      supabaseAdmin.from('calibration_sessions').select('id', { count: 'exact', head: true }),
    ]);
    if (recs.error || fb.error) return { ok: false, error: 'Could not load metrics.' };
    const metrics = computeValidationMetrics(
      (recs.data ?? []).flatMap((r) => {
        const k = settingKeyOf(r.setting_id);
        return k ? [{ id: r.id, userId: r.user_id, deviceId: r.device_id, settingKey: k, suggested: Number(r.suggested_value), confidence: r.confidence as 'high' | 'medium' | 'low', dataCompleteness: Number(r.data_completeness), createdAt: r.created_at }] : [];
      }),
      (fb.data ?? []).map((f) => ({ recommendationId: f.recommendation_id, previousValue: Number(f.previous_value), newValue: Number(f.new_value), type: f.feedback_type as FeedbackType, createdAt: f.created_at })),
      sessions.count ?? 0,
      cfg
    );
    return { ok: true, metrics, modelVersionId: model.data.id };
  });
