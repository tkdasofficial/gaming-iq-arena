import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import {
  buildRecommendation,
  normalizeDevice,
  RecommendationError,
  type GameConfig,
  type Recommendation,
} from '../engine/recommend';

const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

export type RecommendationResponse = { ok: true; recommendation: Recommendation } | { ok: false; error: string };

/**
 * Generates a game-specific sensitivity recommendation on the server.
 * Only ids come from the browser; specs and game config are read from the database.
 */
export const generateRecommendation = createServerFn({ method: 'POST' })
  .inputValidator((input: { deviceId: string; gameId: string }) => {
    const deviceId = String(input?.deviceId ?? '');
    const gameId = String(input?.gameId ?? '');
    if (!ID.test(deviceId)) throw new Error('Choose a phone first.');
    if (!ID.test(gameId)) throw new Error('Choose a game first.');
    return { deviceId, gameId };
  })
  .handler(async ({ data }): Promise<RecommendationResponse> => {
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    const url = process.env['SUPABASE_URL'];
    if (!key || !url) return { ok: false, error: 'The service is not configured right now.' };
    const db = createClient<Database>(url, key, {
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

    const [deviceRes, gameRes] = await Promise.all([
      db.from('devices').select('id, data').eq('id', data.deviceId).maybeSingle(),
      db.from('games').select('id, name, short_name, publisher, supports_gyro, config').eq('id', data.gameId).maybeSingle(),
    ]);
    if (deviceRes.error || gameRes.error) {
      console.error('generateRecommendation read failed', deviceRes.error?.message, gameRes.error?.message);
      return { ok: false, error: 'Could not reach the database. Please try again.' };
    }
    if (!deviceRes.data) return { ok: false, error: 'This phone is not in the catalog.' };
    if (!gameRes.data) return { ok: false, error: 'This game is not supported.' };

    const raw: Record<string, unknown> = { ...((deviceRes.data.data ?? {}) as Record<string, unknown>), id: deviceRes.data.id };
    let chipset: Record<string, unknown> | null = null;
    if (typeof raw.chipsetId === 'string') {
      const chip = await db.from('chipsets').select('data').eq('id', raw.chipsetId).maybeSingle();
      chipset = (chip.data?.data as Record<string, unknown>) ?? null;
    }

    try {
      const recommendation = buildRecommendation(normalizeDevice(raw, chipset), {
        id: gameRes.data.id,
        name: gameRes.data.name,
        shortName: gameRes.data.short_name,
        publisher: gameRes.data.publisher,
        supportsGyro: gameRes.data.supports_gyro,
        config: gameRes.data.config as unknown as GameConfig,
      });
      return { ok: true, recommendation };
    } catch (err) {
      if (err instanceof RecommendationError) return { ok: false, error: err.message };
      console.error('generateRecommendation failed', err);
      return { ok: false, error: 'Something went wrong while generating settings.' };
    }
  });
