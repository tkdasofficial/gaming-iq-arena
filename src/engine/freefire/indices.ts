/**
 * Weighted indices (Performance Index, Touch & Display Index) on the 0–10 quality scale.
 * Only valid components contribute; their weights are re-normalised. Missing components are
 * never treated as 0 or as perfect — they lower `completeness`, which confidence uses.
 */
import type { UsableStatus } from './config';
import { round1, round2 } from './normalize';

export type DataStatus = UsableStatus | 'pending' | 'not_verified' | 'not_applicable';
export const USABLE: readonly DataStatus[] = ['verified', 'manufacturer_reported', 'user_reported', 'estimated'];
export const isUsable = (s: DataStatus): s is UsableStatus => USABLE.includes(s);

export interface ComponentInput {
  /** 0–10 quality, or null when unknown. */
  quality: number | null;
  status: DataStatus;
  raw?: number | string | null;
  unit?: string;
  source?: string | null;
}

export interface IndexComponent extends ComponentInput {
  id: string;
  weight: number;
  used: boolean;
}

export interface IndexResult {
  /** 0–10, null when no component is available. */
  score: number | null;
  /** Share of applicable weight backed by usable data (0–1). */
  completeness: number;
  /** Weighted reliability of the data used (0–1, 0 when nothing used). */
  reliability: number;
  incomplete: boolean;
  components: IndexComponent[];
}

export const missing = (status: DataStatus = 'not_verified'): ComponentInput => ({ quality: null, status });

export function computeIndex<K extends string>(
  weights: Record<K, number>,
  inputs: Partial<Record<K, ComponentInput>>,
  reliability: Record<UsableStatus, number>
): IndexResult {
  let applicable = 0;
  let used = 0;
  let weighted = 0;
  let rel = 0;
  const components: IndexComponent[] = [];
  for (const id of Object.keys(weights) as K[]) {
    const w = weights[id];
    const input = inputs[id] ?? missing();
    const ok = isUsable(input.status) && input.quality !== null && Number.isFinite(input.quality);
    if (input.status !== 'not_applicable') applicable += w;
    if (ok) {
      used += w;
      weighted += w * (input.quality as number);
      rel += w * reliability[input.status as UsableStatus];
    }
    components.push({ ...input, id, weight: w, used: ok });
  }
  const completeness = applicable > 0 ? used / applicable : 0;
  return {
    score: used > 0 ? round1(weighted / used) : null,
    completeness: round2(completeness),
    reliability: used > 0 ? round2(rel / used) : 0,
    incomplete: completeness < 0.999,
    components,
  };
}
