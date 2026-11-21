import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { computeFreeFire, publicClient, validateFreeFireInput, type DeviceAge, type FreeFireResponse } from './rotation.core';

export type { FreeFireResponse } from './rotation.core';

/**
 * Free Fire settings for anyone (signed out too). Only ids, phone age and the two-box
 * rotation answer come from the browser; all six values are calculated here.
 * The calculation is logged (without a user id) so it stays reproducible.
 */
export const calculateFreeFire = createServerFn({ method: 'POST' })
  .inputValidator(validateFreeFireInput)
  .handler(async ({ data }): Promise<FreeFireResponse> => {
    const db = publicClient();
    if (!db) return { ok: false, error: 'The service is not configured right now.' };
    return computeFreeFire(db, data, null);
  });

/** Signed-in players: same calculation, plus the rotation test is saved to their account. */
export const calculatePersonalFreeFire = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateFreeFireInput)
  .handler(async ({ data, context }): Promise<FreeFireResponse> => {
    return computeFreeFire(context.supabase, data, context.userId);
  });

export interface SavedRotationCalibration {
  deviceAge: DeviceAge;
  /** Rotations at General 200. */
  general200Rotation: number;
}

/** Prefills the form with the player's saved General 200 test for this phone (older General 0 answers are not reused). */
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
      .select('device_age_range, general_200_rotation')
      .eq('user_id', context.userId)
      .eq('device_id', data.deviceId)
      .eq('game_id', data.gameId)
      .maybeSingle();
    if (error) throw new Error('Could not load your saved test.');
    if (!row || row.general_200_rotation === null) return null;
    return { deviceAge: row.device_age_range as DeviceAge, general200Rotation: Number(row.general_200_rotation) };
  });
