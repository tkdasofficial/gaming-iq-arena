/**
 * Registers the Free Fire calculator configuration (src/engine/freefire/model-config.*.json)
 * as a row in public.model_versions. Insert-if-missing: an existing version is never rewritten,
 * so past recommendations keep pointing at the exact configuration that produced them.
 * Changing weights = add a new model-config.vN.json with a new version, then run this script.
 *
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/seed-model-version.ts [--activate]
 */
import { createClient } from '@supabase/supabase-js';
import config from '../src/engine/freefire/model-config.v1.json';
import { parseModelConfig, modelVersionId } from '../src/engine/freefire/config';

const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const activate = process.argv.includes('--activate');

const cfg = parseModelConfig(config);
const id = modelVersionId(cfg);
const db = createClient(url, key, { auth: { persistSession: false } });

const { error } = await db.from('model_versions').upsert(
  {
    id,
    model_name: cfg.modelName,
    version: cfg.version,
    game_id: cfg.gameIds[0] as string,
    configuration: config as never,
    weights: { pi: cfg.pi.weights, tdi: cfg.tdi.weights } as never,
    is_active: false,
    notes: 'Initial engineering weights and coefficients. Not yet validated against real-world measurements.',
  },
  { onConflict: 'id', ignoreDuplicates: true }
);
if (error) throw new Error(error.message);
console.log(`model version ${id} ensured`);

if (activate) {
  for (const gameId of cfg.gameIds) {
    const off = await db.from('model_versions').update({ is_active: false }).eq('game_id', gameId).neq('id', id);
    if (off.error) throw new Error(off.error.message);
  }
  const on = await db.from('model_versions').update({ is_active: true }).eq('id', id);
  if (on.error) throw new Error(on.error.message);
  console.log(`model version ${id} is now active`);
}
