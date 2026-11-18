import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { Recommendation } from '../engine/recommend';
import { handleBackendError, OperationType } from './errors';
import { FIELD_LIMITS, clampString } from './validation';

export type Unsubscribe = () => void;

export interface SavedResult {
  id: string;
  name: string;
  createdAt: string;
  recommendation: Recommendation;
}

// --- Tiny change bus: lets list subscribers refetch after this client writes. ---
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export async function checkIsAdmin(uid: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', { _user_id: uid, _role: 'admin' });
  if (error) return false;
  return Boolean(data);
}

function isRecommendation(value: unknown): value is Recommendation {
  const v = value as Recommendation | null;
  return Boolean(v && typeof v.gameId === 'string' && v.device && Array.isArray(v.core) && Array.isArray(v.groups));
}

/** Saved results for one player. Re-runs after every save/delete from this tab. */
export function subscribeSavedResults(
  uid: string,
  onData: (items: SavedResult[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  let active = true;
  const run = async () => {
    const { data, error } = await supabase
      .from('saved_setups')
      .select('id, name, created_at, input')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false });
    if (!active) return;
    if (error) {
      onError?.('Could not load your saved results.');
      return;
    }
    const items: SavedResult[] = [];
    for (const row of data ?? []) {
      const input = (row.input ?? {}) as { version?: number; recommendation?: unknown };
      if (input.version === 2 && isRecommendation(input.recommendation)) {
        items.push({ id: row.id, name: row.name, createdAt: row.created_at, recommendation: input.recommendation });
      }
    }
    onData(items);
  };
  void run();
  listeners.add(run);
  return () => {
    active = false;
    listeners.delete(run);
  };
}

export async function saveResult(uid: string, name: string, rec: Recommendation): Promise<string> {
  const sliders: Record<string, number> = {};
  for (const g of rec.groups) for (const s of g.settings) sliders[`${g.id}.${s.key}`] = s.value;
  const { data, error } = await supabase
    .from('saved_setups')
    .insert({
      owner_id: uid,
      name: clampString(name, FIELD_LIMITS.setupNameMaxLength, `${rec.device.fullName} · ${rec.gameShortName}`),
      game: rec.gameId,
      input: JSON.parse(JSON.stringify({ version: 2, deviceId: rec.device.id, gameId: rec.gameId, recommendation: rec })) as Json,
      sliders: sliders as Json,
    })
    .select('id')
    .single();
  if (error) handleBackendError(error, OperationType.CREATE, 'saved_setups');
  notify();
  return data.id;
}

export async function removeSavedResult(uid: string, id: string): Promise<void> {
  const { error } = await supabase.from('saved_setups').delete().eq('owner_id', uid).eq('id', id);
  if (error) handleBackendError(error, OperationType.DELETE, 'saved_setups');
  notify();
}
