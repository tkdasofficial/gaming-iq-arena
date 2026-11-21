/**
 * Server-side Free Fire pipeline (Version 1 model).
 * Validates the player's rotation count at General 200, builds the Free Fire settings
 * layout for the chosen phone, fills all six values from the single calculation
 * function, stores a reproducible log, and (for signed-in players) saves the test.
 */
import type { Json } from '@/integrations/supabase/types';
import { computeRecommendation, publicClient, validateIds, type Db } from './recommend.core';
import type { Recommendation } from '../engine/recommend';
import {
  applyFreeFireV1,
  calculateFreeFireRaw,
  FF_V1_REFERENCE,
  FF_V1_VERSION,
  FreeFireInputError,
  INVALID_ROTATION_MESSAGE,
  summarizeFreeFireV1,
  validateGeneral200Rotation,
} from '../engine/freefire/sensitivity-v1';

export const DEVICE_AGES = [
  { id: 'under-6-months', label: 'Less than 6 months' },
  { id: '6-12-months', label: '6–12 months' },
  { id: '1-2-years', label: '1–2 years' },
  { id: '2-3-years', label: '2–3 years' },
  { id: 'over-3-years', label: 'More than 3 years' },
] as const;
export type DeviceAge = (typeof DEVICE_AGES)[number]['id'];
export const DEVICE_AGE_LABELS: Record<DeviceAge, string> = Object.fromEntries(DEVICE_AGES.map((a) => [a.id, a.label])) as Record<DeviceAge, string>;

export const FREE_FIRE_ID = 'free-fire';

export interface ValidatedFreeFireInput {
  deviceId: string;
  gameId: string;
  deviceAge: DeviceAge;
  /** Rotations at General 200 (R). */
  general200Rotation: number;
}

/** Two-box picker: whole rotations (0–99) + decimal digit (0–9) → R, which must be above 0. */
export function validateFreeFireInput(input: {
  deviceId: unknown;
  gameId: unknown;
  deviceAge: unknown;
  wholeRotations: unknown;
  decimalDigit: unknown;
}): ValidatedFreeFireInput {
  const { deviceId, gameId } = validateIds({ deviceId: String(input?.deviceId ?? ''), gameId: String(input?.gameId ?? '') });
  if (gameId !== FREE_FIRE_ID) throw new Error('This calculation is for Free Fire only.');
  const deviceAge = String(input?.deviceAge ?? '') as DeviceAge;
  if (!DEVICE_AGES.some((a) => a.id === deviceAge)) throw new Error('Pick how old your phone is.');
  const whole = input?.wholeRotations;
  const digit = input?.decimalDigit;
  if (typeof whole !== 'number' || !Number.isInteger(whole) || whole < 0 || whole > 99) throw new Error(INVALID_ROTATION_MESSAGE);
  if (typeof digit !== 'number' || !Number.isInteger(digit) || digit < 0 || digit > 9) throw new Error(INVALID_ROTATION_MESSAGE);
  // Build R from integers so 9 + 5 is exactly 9.5 (no float drift from digit / 10).
  const r = (whole * 10 + digit) / 10;
  try {
    return { deviceId, gameId, deviceAge, general200Rotation: validateGeneral200Rotation(r) };
  } catch (err) {
    if (err instanceof FreeFireInputError) throw new Error(err.message);
    throw err;
  }
}

export type FreeFireResponse = { ok: true; recommendation: Recommendation } | { ok: false; error: string };

export async function computeFreeFire(db: Db, input: ValidatedFreeFireInput, userId: string | null): Promise<FreeFireResponse> {
  // Layout only (names, sections, extras); the six values come from the Version 1 function below.
  const base = await computeRecommendation(db, { deviceId: input.deviceId, gameId: input.gameId }, undefined, { baseOnly: true });
  if (!base.ok) return base;

  const summary = summarizeFreeFireV1(input.general200Rotation, input.deviceAge);
  const raw = calculateFreeFireRaw(input.general200Rotation);
  const recommendation: Recommendation = {
    ...applyFreeFireV1(base.value.recommendation, summary.values),
    basis: [`your ${input.general200Rotation} rotations at General 200`, `the ${FF_V1_REFERENCE.device} reference profile`],
    rotation: summary,
  };

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
          general_200_rotation: input.general200Rotation,
          zero_sensitivity_rotation: null,
          measurement_method: 'full-screen-swipe-general-200',
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
    calculation_version: FF_V1_VERSION,
    general_200_rotation: input.general200Rotation,
    target_rotation: summary.targetRotations,
    scope_factor: raw.scopeFactor,
    raw_recommended_sensitivity: raw.values.general,
    final_recommended_sensitivity: summary.values.general,
    raw_values: raw.values as unknown as Json,
    final_values: summary.values as unknown as Json,
    calculation_status: summary.generalCapped ? 'general-capped' : 'ok',
  });
  if (logError) console.error('calculation log insert failed', logError.message);

  return { ok: true, recommendation };
}

export { publicClient };
