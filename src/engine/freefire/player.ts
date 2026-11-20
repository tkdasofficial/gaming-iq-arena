/** Player intelligence. Every field is optional; null means unknown and is never assumed. */
import type { ModelConfig, PlayerKey } from './config';

export interface PlayerProfile {
  fingerCount: number | null;
  hudLayout: 'default' | 'custom' | null;
  fireButtonSize: number | null;
  fireButtonPosition: 'left' | 'right' | 'both' | null;
  swipeLength: 'short' | 'medium' | 'long' | null;
  swipeSpeed: 'slow' | 'medium' | 'fast' | null;
  playStyle: 'close-range-aggressive' | 'balanced' | 'long-range' | 'precision' | null;
  weaponPreference: 'smg-shotgun' | 'assault-rifle' | 'sniper' | 'mixed' | null;
  dragTechnique: 'drag-shot' | 'tap-fire' | 'mixed' | null;
  gyroStatus: 'on' | 'off' | 'not-available' | null;
  comfortPreference: 'fast' | 'balanced' | 'controlled' | null;
  usesFreeLook: boolean | null;
}

export const EMPTY_PLAYER: PlayerProfile = {
  fingerCount: null,
  hudLayout: null,
  fireButtonSize: null,
  fireButtonPosition: null,
  swipeLength: null,
  swipeSpeed: null,
  playStyle: null,
  weaponPreference: null,
  dragTechnique: null,
  gyroStatus: null,
  comfortPreference: null,
  usesFreeLook: null,
};

export const PLAYER_OPTIONS = {
  hudLayout: ['default', 'custom'],
  fireButtonPosition: ['left', 'right', 'both'],
  swipeLength: ['short', 'medium', 'long'],
  swipeSpeed: ['slow', 'medium', 'fast'],
  playStyle: ['close-range-aggressive', 'balanced', 'long-range', 'precision'],
  weaponPreference: ['smg-shotgun', 'assault-rifle', 'sniper', 'mixed'],
  dragTechnique: ['drag-shot', 'tap-fire', 'mixed'],
  gyroStatus: ['on', 'off', 'not-available'],
  comfortPreference: ['fast', 'balanced', 'controlled'],
} as const;

/** Bucket used by the modifier tables (e.g. fire button 60% → "medium"). Null when unknown. */
export function playerBucket(p: PlayerProfile, key: PlayerKey, cfg: ModelConfig): string | null {
  const v = p[key];
  if (v === null || v === undefined) return null;
  if (key === 'fingerCount') return (v as number) >= 5 ? '5+' : String(v);
  if (key === 'fireButtonSize') {
    const { smallMax, mediumMax } = cfg.playerBuckets.fireButtonSize;
    return (v as number) <= smallMax ? 'small' : (v as number) <= mediumMax ? 'medium' : 'large';
  }
  if (key === 'usesFreeLook') return v ? 'yes' : 'no';
  return String(v);
}

export const isKnown = (p: PlayerProfile, key: PlayerKey) => p[key] !== null && p[key] !== undefined;

/** Validates untrusted input into a PlayerProfile (unknown or invalid → null). */
export function sanitizePlayerProfile(raw: unknown): PlayerProfile {
  const r = (raw ?? {}) as Record<string, unknown>;
  const pick = <T extends readonly string[]>(v: unknown, opts: T): T[number] | null => (opts.includes(v as string) ? (v as T[number]) : null);
  const int = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null);
  return {
    fingerCount: int(r.fingerCount, 2, 6),
    hudLayout: pick(r.hudLayout, PLAYER_OPTIONS.hudLayout),
    fireButtonSize: int(r.fireButtonSize, 10, 200),
    fireButtonPosition: pick(r.fireButtonPosition, PLAYER_OPTIONS.fireButtonPosition),
    swipeLength: pick(r.swipeLength, PLAYER_OPTIONS.swipeLength),
    swipeSpeed: pick(r.swipeSpeed, PLAYER_OPTIONS.swipeSpeed),
    playStyle: pick(r.playStyle, PLAYER_OPTIONS.playStyle),
    weaponPreference: pick(r.weaponPreference, PLAYER_OPTIONS.weaponPreference),
    dragTechnique: pick(r.dragTechnique, PLAYER_OPTIONS.dragTechnique),
    gyroStatus: pick(r.gyroStatus, PLAYER_OPTIONS.gyroStatus),
    comfortPreference: pick(r.comfortPreference, PLAYER_OPTIONS.comfortPreference),
    usesFreeLook: typeof r.usesFreeLook === 'boolean' ? r.usesFreeLook : null,
  };
}
