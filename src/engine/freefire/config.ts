/**
 * Central configuration for the Free Fire hybrid engine.
 * Every weight, normalisation bound, modifier coefficient, threshold and loss weight lives in a
 * versioned JSON document (model-config.vN.json, mirrored in public.model_versions). Nothing else
 * in the engine hard-codes these numbers.
 */

export const SETTING_KEYS = ['general', 'redDot', 'scope2x', 'scope4x', 'sniper', 'freeLook'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

/** Database setting id suffix for each engine key (sensitivity_settings.key). */
export const SETTING_DB_KEY: Record<SettingKey, string> = {
  general: 'general',
  redDot: 'red-dot',
  scope2x: 'scope-2x',
  scope4x: 'scope-4x',
  sniper: 'sniper',
  freeLook: 'free-look',
};

export const PI_KEYS = ['fps', 'frameStability', 'gpu', 'cpuSingle', 'cpuMulti', 'thermal'] as const;
export type PiKey = (typeof PI_KEYS)[number];
export const TDI_KEYS = ['touchLatency', 'inputConsistency', 'touchSampling', 'touchController', 'screenGeometry', 'refreshRate'] as const;
export type TdiKey = (typeof TDI_KEYS)[number];
export type DeviceInputKey = PiKey | TdiKey;

export const PLAYER_KEYS = [
  'fingerCount',
  'hudLayout',
  'fireButtonSize',
  'fireButtonPosition',
  'swipeLength',
  'swipeSpeed',
  'playStyle',
  'weaponPreference',
  'dragTechnique',
  'gyroStatus',
  'comfortPreference',
  'usesFreeLook',
] as const;
export type PlayerKey = (typeof PLAYER_KEYS)[number];

export const LOSS_TERMS = ['movementError', 'overshoot', 'undershoot', 'instability', 'timeToTarget'] as const;
export type LossTerm = (typeof LOSS_TERMS)[number];

export const STALE_KEYS = ['gameVersion', 'hudLayout', 'fireButtonSize', 'fireButtonPosition', 'fpsCap', 'graphicsSetting', 'refreshRateHz', 'gyroStatus'] as const;
export type StaleKey = (typeof STALE_KEYS)[number];

export type Normalizer = { type: 'linear' | 'log'; worst: number; best: number; unit?: string };

export interface DeviceModifier {
  input: DeviceInputKey;
  /** deficit: m = -coef × (10 − q)/10. centered: m = coef × (q − 5)/5. */
  mode: 'deficit' | 'centered';
  coef: number;
}

export interface SettingConfig {
  device: DeviceModifier[];
  /** Player input → bucket → additive fraction applied to the base value. */
  player: Partial<Record<PlayerKey, Record<string, number>>>;
  confidenceDeviceInputs: DeviceInputKey[];
  confidencePlayerInputs: PlayerKey[];
  maxAdjustment: number;
  loss: Record<LossTerm, number>;
  feedbackStep: number;
}

export type Confidence = 'high' | 'medium' | 'low';
export type UsableStatus = 'verified' | 'manufacturer_reported' | 'user_reported' | 'estimated';

export interface ModelConfig {
  modelName: string;
  version: string;
  gameIds: string[];
  slider: { min: number; max: number };
  statusReliability: Record<UsableStatus, number>;
  pi: {
    weights: Record<PiKey, number>;
    normalization: { fps: Normalizer; frameStability: Normalizer };
    thermalImpairment: Record<string, number>;
    benchmarks: Record<string, Partial<Record<'cpuSingle' | 'cpuMulti' | 'gpu', Normalizer>>>;
  };
  tdi: { weights: Record<TdiKey, number>; normalization: Record<TdiKey, Normalizer> };
  playerBuckets: { fireButtonSize: { smallMax: number; mediumMax: number } };
  settings: Record<SettingKey, SettingConfig>;
  rangeSpread: Record<Confidence, number>;
  confidence: {
    weights: { device: number; player: number; calibration: number };
    calibrationPart: Record<'calibrated' | 'feedbackStable' | 'feedback' | 'insufficient_data' | 'stale' | 'not_calibrated', number>;
    high: { minScore: number; minDevice: number };
    medium: { minScore: number };
  };
  calibration: {
    testPoints: number[];
    minRepetitions: number;
    minPoints: number;
    fineStep: number;
    swipeDistanceMm: number;
    timeReferenceMs: number;
    staleWhenChanged: StaleKey[];
  };
  feedback: { unstableStepFactor: number };
  usefulness: { tolerance: number; maxSmallCorrections: number; smallCorrectionMax: number };
}

export class ModelConfigError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fin = (v: unknown, path: string): number => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ModelConfigError(`${path} must be a number`);
  return v;
};
function weights<K extends string>(v: unknown, keys: readonly K[], path: string): Record<K, number> {
  if (!isObj(v)) throw new ModelConfigError(`${path} missing`);
  let sum = 0;
  for (const k of keys) {
    const w = fin(v[k], `${path}.${k}`);
    if (w < 0) throw new ModelConfigError(`${path}.${k} must not be negative`);
    sum += w;
  }
  if (Math.abs(sum - 1) > 1e-6) throw new ModelConfigError(`${path} must add up to 1 (got ${sum})`);
  return v as Record<K, number>;
}
function normalizer(v: unknown, path: string): Normalizer {
  if (!isObj(v) || (v.type !== 'linear' && v.type !== 'log')) throw new ModelConfigError(`${path} needs type linear|log`);
  const worst = fin(v.worst, `${path}.worst`);
  const best = fin(v.best, `${path}.best`);
  if (worst === best) throw new ModelConfigError(`${path} worst and best must differ`);
  if (v.type === 'log' && (worst <= 0 || best <= 0)) throw new ModelConfigError(`${path} log bounds must be positive`);
  return v as Normalizer;
}

/** Validates a configuration document (from the JSON file or a model_versions row). */
export function parseModelConfig(raw: unknown): ModelConfig {
  if (!isObj(raw)) throw new ModelConfigError('configuration must be an object');
  const c = raw as unknown as ModelConfig;
  if (typeof c.modelName !== 'string' || typeof c.version !== 'string') throw new ModelConfigError('modelName and version required');
  if (!Array.isArray(c.gameIds) || c.gameIds.length === 0) throw new ModelConfigError('gameIds required');
  const min = fin(c.slider?.min, 'slider.min');
  const max = fin(c.slider?.max, 'slider.max');
  if (min >= max) throw new ModelConfigError('slider.min must be below slider.max');
  weights(c.pi?.weights, PI_KEYS, 'pi.weights');
  weights(c.tdi?.weights, TDI_KEYS, 'tdi.weights');
  normalizer(c.pi.normalization?.fps, 'pi.normalization.fps');
  normalizer(c.pi.normalization?.frameStability, 'pi.normalization.frameStability');
  for (const k of TDI_KEYS) normalizer(c.tdi.normalization?.[k], `tdi.normalization.${k}`);
  for (const [name, b] of Object.entries(c.pi.benchmarks ?? {})) {
    for (const [k, n] of Object.entries(b ?? {})) normalizer(n, `pi.benchmarks.${name}.${k}`);
  }
  for (const key of SETTING_KEYS) {
    const s = c.settings?.[key];
    if (!s) throw new ModelConfigError(`settings.${key} missing`);
    weights(s.loss, LOSS_TERMS, `settings.${key}.loss`);
    fin(s.maxAdjustment, `settings.${key}.maxAdjustment`);
    fin(s.feedbackStep, `settings.${key}.feedbackStep`);
    for (const m of s.device ?? []) {
      if (![...PI_KEYS, ...TDI_KEYS].includes(m.input)) throw new ModelConfigError(`settings.${key}: unknown device input ${m.input}`);
      fin(m.coef, `settings.${key}.device.${m.input}.coef`);
    }
    for (const p of Object.keys(s.player ?? {})) {
      if (!PLAYER_KEYS.includes(p as PlayerKey)) throw new ModelConfigError(`settings.${key}: unknown player input ${p}`);
    }
  }
  weights(c.confidence?.weights, ['device', 'player', 'calibration'] as const, 'confidence.weights');
  fin(c.calibration?.minRepetitions, 'calibration.minRepetitions');
  fin(c.calibration?.minPoints, 'calibration.minPoints');
  fin(c.usefulness?.tolerance, 'usefulness.tolerance');
  return c;
}

export const modelVersionId = (c: Pick<ModelConfig, 'modelName' | 'version'>) => `${c.modelName}@${c.version}`;
