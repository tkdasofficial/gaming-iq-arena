/**
 * Gaming IQ Free Fire sensitivity — Version 1 calculation model (pure, runs on the server).
 *
 * The only input is R: full 360° camera rotations from one full-screen swipe with
 * General set to 200. Formulas and reference values are fixed by the owner's brief and
 * must not change without explicit approval:
 *   G         = min(200, 2800 / R)            (2800 = 200 × 14 target rotations)
 *   F         = 10.5 / R                      (Redmi 10C 4G: 10.5 rotations at General 200)
 *   Red Dot   = 95 × F,  2X = 125 × F,  4X = 75 × F,  Sniper = 25 × F
 *   Free Look = G × (65 / 190)                (from the calculated G, never from R)
 * Intermediate values are never rounded; each final value is rounded, then clamped to 0–200.
 */

export const FF_V1_VERSION = 'ff-sensitivity-v1';
export const FF_V1_TARGET_ROTATIONS = 14;
export const FF_V1_MAX = 200;
export const FF_V1_MIN = 0;

/** Redmi 10C 4G reference measurements and profile (Version 1, fixed). */
export const FF_V1_REFERENCE = {
  device: 'Redmi 10C 4G',
  general200Rotation: 10.5,
  redDot: 95,
  scope2x: 125,
  scope4x: 75,
  sniper: 25,
  freeLookGeneral: 190,
  freeLook: 65,
} as const;

export const FF_V1_KEYS = ['general', 'redDot', 'scope2x', 'scope4x', 'sniper', 'freeLook'] as const;
export type FreeFireV1Key = (typeof FF_V1_KEYS)[number];
export type FreeFireV1Values = Record<FreeFireV1Key, number>;

export const INVALID_ROTATION_MESSAGE = 'Please enter a valid General 200 rotation count.';

export class FreeFireInputError extends Error {}

/** Rejects empty, zero, negative and non-numeric values. Never substitutes a default. */
export function validateGeneral200Rotation(r: unknown): number {
  if (typeof r !== 'number' || !Number.isFinite(r) || r <= 0) throw new FreeFireInputError(INVALID_ROTATION_MESSAGE);
  return r;
}

/** Unrounded values, in the brief's calculation order. */
export function calculateFreeFireRaw(r: unknown): { values: FreeFireV1Values; scopeFactor: number } {
  const R = validateGeneral200Rotation(r);
  const G = Math.min(FF_V1_MAX, (FF_V1_MAX * FF_V1_TARGET_ROTATIONS) / R);
  const F = FF_V1_REFERENCE.general200Rotation / R;
  return {
    scopeFactor: F,
    values: {
      general: G,
      redDot: FF_V1_REFERENCE.redDot * F,
      scope2x: FF_V1_REFERENCE.scope2x * F,
      scope4x: FF_V1_REFERENCE.scope4x * F,
      sniper: FF_V1_REFERENCE.sniper * F,
      freeLook: G * (FF_V1_REFERENCE.freeLook / FF_V1_REFERENCE.freeLookGeneral),
    },
  };
}

const finalValue = (v: number) => Math.min(FF_V1_MAX, Math.max(FF_V1_MIN, Math.round(v)));

/** The single source of truth for Free Fire's six values. */
export function calculateFreeFireSensitivity(r: unknown): FreeFireV1Values {
  const { values } = calculateFreeFireRaw(r);
  return Object.fromEntries(FF_V1_KEYS.map((k) => [k, finalValue(values[k])])) as FreeFireV1Values;
}

/** Result summary stored on a recommendation (and in saved snapshots). */
export interface FreeFireV1Summary {
  model: typeof FF_V1_VERSION;
  general200Rotation: number;
  targetRotations: number;
  scopeFactor: number;
  referenceDevice: string;
  referenceRotation: number;
  values: FreeFireV1Values;
  /** True when 2800 / R went above 200 and General was capped at 200. */
  generalCapped: boolean;
  deviceAge?: string;
}

export function summarizeFreeFireV1(r: number, deviceAge?: string): FreeFireV1Summary {
  const { scopeFactor } = calculateFreeFireRaw(r);
  return {
    model: FF_V1_VERSION,
    general200Rotation: r,
    targetRotations: FF_V1_TARGET_ROTATIONS,
    scopeFactor,
    referenceDevice: FF_V1_REFERENCE.device,
    referenceRotation: FF_V1_REFERENCE.general200Rotation,
    values: calculateFreeFireSensitivity(r),
    generalCapped: (FF_V1_MAX * FF_V1_TARGET_ROTATIONS) / r > FF_V1_MAX,
    ...(deviceAge ? { deviceAge } : {}),
  };
}

/** Database key (sensitivity_settings.key) for each value. */
const DB_KEY: Record<FreeFireV1Key, string> = {
  general: 'general',
  redDot: 'red-dot',
  scope2x: 'scope-2x',
  scope4x: 'scope-4x',
  sniper: 'sniper',
  freeLook: 'free-look',
};

/**
 * Puts the six values into a recommendation everywhere they appear (headline grid,
 * settings list, copy-all, saved snapshot). Nothing is recalculated here.
 */
export function applyFreeFireV1<
  T extends { core: { id: string; value: number }[]; groups: { settings: { key: string; value: number | null }[] }[] },
>(rec: T, values: FreeFireV1Values): T {
  const byDbKey = new Map(FF_V1_KEYS.map((k) => [DB_KEY[k], values[k]] as const));
  return {
    ...rec,
    core: rec.core.map((c) => (c.id in values ? { ...c, value: values[c.id as FreeFireV1Key] } : c)),
    groups: rec.groups.map((g) => ({
      ...g,
      settings: g.settings.map((s) => (byDbKey.has(s.key) ? { ...s, value: byDbKey.get(s.key)! } : s)),
    })),
  };
}
