import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { publicClient } from './recommend.core';
import { computeRotation, validateRotationInput, type DeviceAge, type RotationResponse } from './rotation.core';

export type { RotationResponse } from './rotation.core';

/**
 * Rotation-based General Sensitivity for anyone (signed out too).
 * Only ids and the two-box rotation answer come from the browser; config, measured
 * curves and component data are read from the database. The calculation is logged
 * (without a user id) so it stays reproducible.
 */
export const calculateGeneralRotation = createServerFn({ method: 'POST' })
  .inputValidator(validateRotationInput)
  .handler(async ({ data }): Promise<RotationResponse> => {
    const db = publicClient();
    if (!db) return { ok: false, error: 'The service is not configured right now.' };
    return computeRotation(db, data, null);
  });

/** Signed-in players: same calculation, plus the calibration is saved to their account. */
export const calculatePersonalRotation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateRotationInput)
  .handler(async ({ data, context }): Promise<RotationResponse> => {
    return computeRotation(context.supabase, data, context.userId);
  });

export interface SavedRotationCalibration {
  deviceAge: DeviceAge;
  zeroRotation: number;
}

/** Prefills the rotation form with the player's saved answers for this phone + game. */
export const getRotationCalibration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { deviceId: string; gameId: string }) => {
    const deviceId = String(input?.deviceId ?? '');
    const gameId = String(input?.gameId ?? '');
    if (!deviceId || !gameId) throw new Error('Choose a phone and game first.');
    return { deviceId, gameId };
  })
  .handler(async ({ data, context }): Promise<SavedRotationCalibration | null> => {
    const { data: row, error } = await context.supabase
      .from('device_user_calibrations')
      .select('device_age_range, zero_sensitivity_rotation')
      .eq('user_id', context.userId)
      .eq('device_id', data.deviceId)
      .eq('game_id', data.gameId)
      .maybeSingle();
    if (error) throw new Error('Could not load your saved test.');
    if (!row) return null;
    return { deviceAge: row.device_age_range as DeviceAge, zeroRotation: Number(row.zero_sensitivity_rotation) };
  });
