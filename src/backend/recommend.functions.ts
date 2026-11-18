import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { buildRecommendation, normalizeDevice, RecommendationError, type Recommendation } from '../engine/recommend';
import { assembleGameRecord } from '../engine/sensitivity';

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
      db
        .from('games')
        .select('id, name, short_name, publisher, supports_gyro, sensitivity_schema_id, config')
        .eq('id', data.gameId)
        .maybeSingle(),
    ]);
    if (deviceRes.error || gameRes.error) {
      console.error('generateRecommendation read failed', deviceRes.error?.message, gameRes.error?.message);
      return { ok: false, error: 'Could not reach the database. Please try again.' };
    }
    if (!deviceRes.data) return { ok: false, error: 'This phone is not in the catalog.' };
    if (!gameRes.data) return { ok: false, error: 'This game is not supported.' };
    const game = gameRes.data;
    const schemaId = game.sensitivity_schema_id;
    if (!schemaId) return { ok: false, error: `${game.name} has no sensitivity setup yet.` };

    // The game's own sensitivity structure + its starting values. Nothing from other schemas is read.
    const raw: Record<string, unknown> = { ...((deviceRes.data.data ?? {}) as Record<string, unknown>), id: deviceRes.data.id };
    const chipsetId = typeof raw.chipsetId === 'string' ? raw.chipsetId : null;
    const [schemaRes, catRes, setRes, profRes, chipRes] = await Promise.all([
      db.from('sensitivity_schemas').select('id, name, unit').eq('id', schemaId).maybeSingle(),
      db.from('sensitivity_categories').select('id, schema_id, label, description, display_order, requires_gyro').eq('schema_id', schemaId),
      db
        .from('sensitivity_settings')
        .select('id, schema_id, category_id, key, label, description, min_value, max_value, display_order, input_kind, core_slot')
        .eq('schema_id', schemaId),
      db.from('game_sensitivity_profiles').select('game_id, schema_id, setting_id, recommended_value').eq('game_id', game.id),
      chipsetId ? db.from('chipsets').select('data').eq('id', chipsetId).maybeSingle() : Promise.resolve(null),
    ]);
    const readError = schemaRes.error ?? catRes.error ?? setRes.error ?? profRes.error;
    if (readError) {
      console.error('generateRecommendation sensitivity read failed', readError.message);
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
      if (issues.length) console.warn('generateRecommendation ignored rows', game.id, issues);
      const recommendation = buildRecommendation(normalizeDevice(raw, chipset), record);
      return { ok: true, recommendation };
    } catch (err) {
      if (err instanceof RecommendationError) return { ok: false, error: err.message };
      console.error('generateRecommendation failed', err);
      return { ok: false, error: 'Something went wrong while generating settings.' };
    }
  });
