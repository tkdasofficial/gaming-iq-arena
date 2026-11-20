/**
 * Six independent sensitivity engines (General, Red Dot, 2X, 4X, Sniper, Free Look).
 * Each one has its own dependency map, modifiers, loss weights, calibration data and feedback
 * history from the model configuration. No engine derives its value from another engine
 * (no fixed Red Dot offset, no 2X/4X ratio, 4X is never forced below 2X).
 *
 * Value = the game's stored starting value × (1 + Σ setting-specific modifiers), capped.
 * Modifiers use individual measured components, not the PI/TDI composites, so nothing is
 * counted twice; PI/TDI completeness feeds confidence and the width of the suggested range.
 */
import type { Confidence, DeviceInputKey, ModelConfig, PlayerKey, SettingKey } from './config';
import type { DeviceIntelligence } from './device';
import { isUsable } from './indices';
import { playerBucket, isKnown, type PlayerProfile } from './player';
import type { CalibrationResult } from './calibration';
import { round2 } from './normalize';

export type ValueSource = 'calibration' | 'feedback' | 'preliminary';

export interface Factor {
  id: string;
  label: string;
  /** Signed fraction applied to the starting value (e.g. -0.04 = 4% lower). */
  effect: number;
}

export interface SettingRecommendation {
  key: SettingKey;
  settingId: string;
  label: string;
  base: number;
  preliminary: number;
  suggested: number;
  min: number;
  max: number;
  source: ValueSource;
  calibrationStatus: CalibrationResult['status'];
  confidence: Confidence;
  confidenceScore: number;
  dataCompleteness: number;
  factors: Factor[];
  missingInputs: string[];
  /** Free Look only: the player said they don't use it. */
  notUsed?: boolean;
}

export interface EngineContext {
  cfg: ModelConfig;
  settingId: string;
  label: string;
  base: number;
  device: DeviceIntelligence;
  player: PlayerProfile;
  calibration: CalibrationResult;
  personal: { value: number; stable: boolean } | null;
}

export const DEVICE_LABELS: Record<DeviceInputKey, string> = {
  fps: 'In-game FPS',
  frameStability: 'Frame stability',
  gpu: 'GPU benchmark',
  cpuSingle: 'CPU single-core',
  cpuMulti: 'CPU multi-core',
  thermal: 'Thermal stability',
  touchLatency: 'Touch latency',
  inputConsistency: 'Input consistency',
  touchSampling: 'Touch sampling',
  touchController: 'Touch controller',
  screenGeometry: 'Screen size',
  refreshRate: 'Refresh rate',
};

export const PLAYER_LABELS: Record<PlayerKey, string> = {
  fingerCount: 'Fingers',
  hudLayout: 'HUD layout',
  fireButtonSize: 'Fire button size',
  fireButtonPosition: 'Fire button position',
  swipeLength: 'Swipe length',
  swipeSpeed: 'Swipe speed',
  playStyle: 'Play style',
  weaponPreference: 'Weapon preference',
  dragTechnique: 'Drag technique',
  gyroStatus: 'Gyroscope',
  comfortPreference: 'Comfort',
  usesFreeLook: 'Uses Free Look',
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Setting-specific modifiers from the dependency map. Unknown inputs contribute nothing. */
export function modifiers(key: SettingKey, ctx: EngineContext): Factor[] {
  const s = ctx.cfg.settings[key];
  const out: Factor[] = [];
  for (const m of s.device) {
    const input = ctx.device.inputs[m.input];
    if (!input || !isUsable(input.status) || input.quality === null) continue;
    const q = input.quality;
    const effect = m.mode === 'deficit' ? (-m.coef * (10 - q)) / 10 : (m.coef * (q - 5)) / 5;
    if (Math.abs(effect) >= 0.0005) out.push({ id: m.input, label: DEVICE_LABELS[m.input], effect: round2(effect * 1000) / 1000 });
  }
  for (const [pk, table] of Object.entries(s.player) as [PlayerKey, Record<string, number>][]) {
    const bucket = playerBucket(ctx.player, pk, ctx.cfg);
    if (bucket === null) continue;
    const effect = table[bucket];
    if (effect) out.push({ id: pk, label: `${PLAYER_LABELS[pk]}: ${bucket.replace(/-/g, ' ')}`, effect });
  }
  return out;
}

export function preliminaryValue(base: number, factors: Factor[], maxAdjustment: number, cfg: ModelConfig): number {
  const total = clamp(factors.reduce((sum, f) => sum + f.effect, 0), -maxAdjustment, maxAdjustment);
  return Math.round(clamp(base * (1 + total), cfg.slider.min, cfg.slider.max));
}

/** Confidence is computed separately from the value and never from the chipset tier. */
export function confidenceFor(key: SettingKey, ctx: EngineContext, source: ValueSource) {
  const { cfg } = ctx;
  const s = cfg.settings[key];
  const devIds = s.confidenceDeviceInputs;
  const device = devIds.length
    ? devIds.reduce((sum, id) => {
        const i = ctx.device.inputs[id];
        return sum + (i && isUsable(i.status) && i.quality !== null ? cfg.statusReliability[i.status] : 0);
      }, 0) / devIds.length
    : 0;
  const plIds = s.confidencePlayerInputs;
  const player = plIds.length ? plIds.filter((k) => isKnown(ctx.player, k)).length / plIds.length : 0;
  const part = cfg.confidence.calibrationPart;
  const calibration =
    source === 'calibration'
      ? part.calibrated
      : source === 'feedback'
        ? ctx.personal?.stable
          ? part.feedbackStable
          : part.feedback
        : part[ctx.calibration.status];
  const w = cfg.confidence.weights;
  const score = round2(w.device * device + w.player * player + w.calibration * calibration);
  const level: Confidence =
    source === 'calibration' && score >= cfg.confidence.high.minScore && device >= cfg.confidence.high.minDevice
      ? 'high'
      : score >= cfg.confidence.medium.minScore
        ? 'medium'
        : 'low';
  const known = devIds.filter((id) => { const i = ctx.device.inputs[id]; return i && isUsable(i.status) && i.quality !== null; }).length + plIds.filter((k) => isKnown(ctx.player, k)).length;
  const completeness = devIds.length + plIds.length ? round2(known / (devIds.length + plIds.length)) : 0;
  const missingInputs = [
    ...devIds.filter((id) => { const i = ctx.device.inputs[id]; return !(i && isUsable(i.status) && i.quality !== null); }).map((id) => DEVICE_LABELS[id]),
    ...plIds.filter((k) => !isKnown(ctx.player, k)).map((k) => PLAYER_LABELS[k]),
  ];
  return { score, level, completeness, missingInputs };
}

/** Shared pipeline: preliminary value → calibration → personal feedback → range + confidence. */
function run(key: SettingKey, ctx: EngineContext, extra: Factor[] = []): SettingRecommendation {
  const { cfg } = ctx;
  const s = cfg.settings[key];
  const factors = [...modifiers(key, ctx), ...extra];
  const preliminary = preliminaryValue(ctx.base, factors, s.maxAdjustment, cfg);

  let suggested = preliminary;
  let source: ValueSource = 'preliminary';
  if (ctx.calibration.status === 'calibrated' && ctx.calibration.best !== null) {
    suggested = ctx.calibration.best;
    source = 'calibration';
  } else if (ctx.personal) {
    suggested = ctx.personal.value;
    source = 'feedback';
  }
  suggested = Math.round(clamp(suggested, cfg.slider.min, cfg.slider.max));

  const conf = confidenceFor(key, ctx, source);
  const spread = source === 'calibration' ? Math.min(cfg.rangeSpread[conf.level], cfg.calibration.fineStep) : cfg.rangeSpread[conf.level];
  return {
    key,
    settingId: ctx.settingId,
    label: ctx.label,
    base: ctx.base,
    preliminary,
    suggested,
    min: Math.max(cfg.slider.min, suggested - spread),
    max: Math.min(cfg.slider.max, suggested + spread),
    source,
    calibrationStatus: ctx.calibration.status,
    confidence: conf.level,
    confidenceScore: conf.score,
    dataCompleteness: conf.completeness,
    factors,
    missingInputs: conf.missingInputs,
  };
}

// ---- the six engines ----

/** General: swipe behaviour, touch response, frame stability, screen size, play style. */
export const generalEngine = (ctx: EngineContext) => run('general', ctx);

/** Red Dot: drag technique, swipe speed, fire button geometry, touch response. Not tied to General. */
export const redDotEngine = (ctx: EngineContext) => run('redDot', ctx);

/** 2X: tracking — swipe length/speed, weapon preference, frame stability, touch response. */
export const scope2xEngine = (ctx: EngineContext) => run('scope2x', ctx);

/** 4X: fine control — input consistency, screen size, comfort, weapon preference. */
export const scope4xEngine = (ctx: EngineContext) => run('scope4x', ctx);

/** Sniper: micro-adjustment precision — input consistency, latency, play style, comfort. */
export const sniperEngine = (ctx: EngineContext) => run('sniper', ctx);

/** Free Look: scanning comfort; performance has little influence. Optional for players who don't use it. */
export const freeLookEngine = (ctx: EngineContext): SettingRecommendation => {
  const r = run('freeLook', ctx);
  return ctx.player.usesFreeLook === false ? { ...r, notUsed: true } : r;
};

export const ENGINES: Record<SettingKey, (ctx: EngineContext) => SettingRecommendation> = {
  general: generalEngine,
  redDot: redDotEngine,
  scope2x: scope2xEngine,
  scope4x: scope4xEngine,
  sniper: sniperEngine,
  freeLook: freeLookEngine,
};
