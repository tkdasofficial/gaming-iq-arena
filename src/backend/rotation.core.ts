/**
 * Server-side rotation-based General Sensitivity pipeline (Free Fire).
 * Validates the player's rotation test answers, loads the active config and any
 * verified measured curve from the database, computes the recommendation, stores a
 * reproducible calculation log, and (for signed-in players) saves the calibration.
 */
import type { Json } from '@/integrations/supabase/types';
import { publicClient, validateIds, type Db } from './recommend.core';
import {
  calculateFromCurve,
  calculateGeneralSensitivity,
  MIN_CURVE_POINTS,
  validateZeroRotation,
  type CurvePoint,
  type RotationConfig,
  type RotationResult,
} from '../engine/freefire/rotation';
import { componentProfile, type ComponentPointRule, type ComponentProfileResult, type ComponentReading } from '../engine/freefire/component-points';

export const DEVICE_AGES = [
  { id: 'under-6-months', label: 'Less than 6 months' },
  { id: '6-12-months', label: '6–12 months' },
  { id: '1-2-years', label: '1–2 years' },
  { id: '2-3-years', label: '2–3 years' },
  { id: 'over-3-years', label: 'More than 3 years' },
] as const;
export type DeviceAge = (typeof DEVICE_AGES)[number]['id'];
export const DEVICE_AGE_LABELS: Record<DeviceAge, string> = Object.fromEntries(DEVICE_AGES.map((a) => [a.id, a.label])) as Record<DeviceAge, string>;

export interface ValidatedRotationInput {
  deviceId: string;
  gameId: string;
  deviceAge: DeviceAge;
  zeroRotation: number;
}

/** Two-box picker: whole rotations (1–99) + decimal digit (1–9) → e.g. 9.5. */
export function validateRotationInput(input: {
  deviceId: unknown;
  gameId: unknown;
  deviceAge: unknown;
  wholeRotations: unknown;
  decimalDigit: unknown;
}): ValidatedRotationInput {
  const { deviceId, gameId } = validateIds({ deviceId: String(input?.deviceId ?? ''), gameId: String(input?.gameId ?? '') });
  const deviceAge = String(input?.deviceAge ?? '') as DeviceAge;
  if (!DEVICE_AGES.some((a) => a.id === deviceAge)) throw new Error('Pick how old your phone is.');
  const whole = Number(input?.wholeRotations);
  const digit = Number(input?.decimalDigit);
  if (!Number.isInteger(whole) || whole < 1 || whole > 99) throw new Error('Whole rotations must be between 1 and 99.');
  if (!Number.isInteger(digit) || digit < 1 || digit > 9) throw new Error('The decimal part must be between 1 and 9.');
  return { deviceId, gameId, deviceAge, zeroRotation: validateZeroRotation(whole + digit / 10) };
}

export type RotationResponse =
  | { ok: true; rotation: RotationResult; components: ComponentProfileResult; deviceAge: DeviceAge }
  | { ok: false; error: string };

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v));

export async function computeRotation(db: Db, input: ValidatedRotationInput, userId: string | null): Promise<RotationResponse> {
  const [deviceRes, configRes, curveRes, profilesRes, rulesRes] = await Promise.all([
    db.from('devices').select('id').eq('id', input.deviceId).maybeSingle(),
    db.from('general_sensitivity_config').select('*').eq('game_id', input.gameId).eq('is_active', true).maybeSingle(),
    db
      .from('device_rotation_measurements')
      .select('sensitivity_value, rotation_value, median_rotation')
      .eq('device_id', input.deviceId)
      .eq('game_id', input.gameId)
      .eq('verification_status', 'verified'),
    db.from('component_quality_profiles').select('component_id, benchmark_value, data_confidence').eq('device_id', input.deviceId),
    db.from('component_point_rules').select('*'),
  ]);
  const readError = deviceRes.error ?? configRes.error ?? curveRes.error ?? profilesRes.error ?? rulesRes.error;
  if (readError) {
    console.error('rotation read failed', readError.message);
    return { ok: false, error: 'Could not reach the database. Please try again.' };
  }
  if (!deviceRes.data) return { ok: false, error: 'This phone is not in the catalog.' };
  if (!configRes.data) return { ok: false, error: 'This game has no rotation setup yet.' };

  const cfg: RotationConfig = {
    targetRotation: num(configRes.data.target_rotation),
    minSensitivity: configRes.data.minimum_sensitivity,
    maxSensitivity: configRes.data.maximum_sensitivity,
    gainPerPoint: num(configRes.data.gain_per_point),
    model: 'linear',
    version: configRes.data.configuration_version,
  };

  const points: CurvePoint[] = (curveRes.data ?? []).map((m) => ({
    sensitivity: m.sensitivity_value,
    rotation: num(m.median_rotation ?? m.rotation_value),
  }));
  const rotation =
    (points.length >= MIN_CURVE_POINTS ? calculateFromCurve(input.zeroRotation, points, cfg) : null) ??
    calculateGeneralSensitivity(input.zeroRotation, cfg);

  // Component points are a separate, bounded layer: recorded, never applied to the value.
  const readings: ComponentReading[] = (profilesRes.data ?? []).flatMap((p) =>
    p.benchmark_value === null ? [] : [{ componentId: p.component_id, value: num(p.benchmark_value), confidence: p.data_confidence === null ? null : num(p.data_confidence) }]
  );
  const rules: ComponentPointRule[] = (rulesRes.data ?? []).map((r) => ({
    componentId: r.component_id,
    minBenchmark: num(r.minimum_benchmark),
    maxBenchmark: num(r.maximum_benchmark),
    minPoint: r.minimum_point,
    maxPoint: r.maximum_point,
    weight: num(r.importance_weight),
    method: r.normalization_method === 'linear' ? 'linear' : 'linear-inverse',
    enabled: r.is_enabled,
    ruleVersion: r.rule_version,
  }));
  const components = componentProfile(readings, rules);

  // History is written by the server (service role); players can't insert their own logs.
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  let calibrationId: string | null = null;
  if (userId) {
    const { data: cal, error } = await supabaseAdmin
      .from('device_user_calibrations')
      .upsert(
        {
          user_id: userId,
          device_id: input.deviceId,
          game_id: input.gameId,
          device_age_range: input.deviceAge,
          zero_sensitivity_rotation: input.zeroRotation,
          measurement_method: 'full-screen-swipe',
          confidence_level: 'user-reported',
        },
        { onConflict: 'user_id,device_id,game_id' }
      )
      .select('id')
      .maybeSingle();
    if (error) console.error('calibration upsert failed', error.message);
    calibrationId = cal?.id ?? null;
  }
  const { error: logError } = await supabaseAdmin.from('general_sensitivity_calculation_logs').insert({
    user_id: userId,
    device_id: input.deviceId,
    game_id: input.gameId,
    calibration_id: calibrationId,
    calculation_version: cfg.version,
    zero_sensitivity_rotation: input.zeroRotation,
    target_rotation: cfg.targetRotation,
    raw_recommended_sensitivity: rotation.rawRecommended,
    final_recommended_sensitivity: rotation.recommended,
    predicted_rotation: rotation.predictedRotation,
    maximum_predicted_rotation: rotation.maxPredictedRotation,
    component_contribution: components as unknown as Json,
    calculation_status: rotation.status,
  });
  if (logError) console.error('calculation log insert failed', logError.message);

  return { ok: true, rotation, components, deviceAge: input.deviceAge };
}

export { publicClient };
