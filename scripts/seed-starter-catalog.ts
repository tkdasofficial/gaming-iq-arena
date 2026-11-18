/**
 * Loads the small starter phone catalog (brands listed in
 * data/smartphone-db/starter-catalog.json) into Supabase from the bundled
 * dataset. Existing rows are left untouched (insert-if-missing).
 *
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/seed-starter-catalog.ts
 */
import { createClient } from '@supabase/supabase-js';
import brands from '../data/smartphone-db/brands.json';
import chipsets from '../data/smartphone-db/chipsets.json';
import devices from '../data/smartphone-db/devices.json';
import starter from '../data/smartphone-db/starter-catalog.json';

const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const db = createClient(url, key, { auth: { persistSession: false } });
const pick = starter as Record<string, string[]>;
const byId = new Map((devices as Array<Record<string, unknown>>).map((d) => [String(d.id), d]));

const deviceRows = Object.values(pick).flat().map((id) => {
  const d = byId.get(id);
  if (!d) throw new Error(`Unknown device ${id}`);
  return { id, brand_id: String(d.brandId), release_date: String(d.releaseDate), data: d };
});
const chipIds = new Set(deviceRows.map((r) => String((r.data as { chipsetId: string }).chipsetId)));
const chipRows = (chipsets as Array<Record<string, unknown>>)
  .filter((c) => chipIds.has(String(c.id)))
  .map((c) => ({ id: String(c.id), data: c }));
const brandRows = (brands as Array<Record<string, unknown>>)
  .filter((b) => pick[String(b.id)])
  .map((b) => ({ id: String(b.id), data: { ...b, deviceCount: pick[String(b.id)].length } }));

for (const [table, rows] of [
  ['brands', brandRows],
  ['chipsets', chipRows],
  ['devices', deviceRows],
] as const) {
  const { error } = await db.from(table).upsert(rows as never, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table}: ${rows.length} rows ensured`);
}
