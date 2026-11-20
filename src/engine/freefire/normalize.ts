import type { Normalizer } from './config';

/** All quality scores use 0 = very poor … 10 = excellent. */
const clamp10 = (q: number) => Math.max(0, Math.min(10, q));

/**
 * Maps a raw measurement onto the 0–10 quality scale. `worst` maps to 0 and `best` to 10, so
 * lower-is-better values (latency) just use worst > best. Missing input stays null — never 0.
 */
export function normalize(raw: number | null | undefined, n: Normalizer): number | null {
  if (raw === null || raw === undefined || !Number.isFinite(raw)) return null;
  if (n.type === 'log') {
    if (raw <= 0) return null;
    return clamp10((10 * (Math.log(raw) - Math.log(n.worst))) / (Math.log(n.best) - Math.log(n.worst)));
  }
  return clamp10((10 * (raw - n.worst)) / (n.best - n.worst));
}

/** Impairment scale (0 best, 10 worst) → quality scale (0 worst, 10 best). */
export function impairmentToQuality(impairment: number | null | undefined): number | null {
  if (impairment === null || impairment === undefined || !Number.isFinite(impairment)) return null;
  return 10 - clamp10(impairment);
}

export function median(values: readonly number[]): number | null {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? (xs[mid] as number) : ((xs[mid - 1] as number) + (xs[mid] as number)) / 2;
}

export const round1 = (v: number) => Math.round(v * 10) / 10;
export const round2 = (v: number) => Math.round(v * 100) / 100;
