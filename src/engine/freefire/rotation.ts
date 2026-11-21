/**
 * Free Fire General Sensitivity rotation engine (pure, runs on the server).
 *
 * The player measures how many full camera rotations one full-screen swipe produces
 * with General Sensitivity set to 0 ("zero sensitivity rotation"). The engine picks
 * the General value that brings the camera close to a configurable target rotation.
 *
 * Initial model (a hypothesis, NOT a verified game mechanic):
 *   predicted(S) = R0 * (1 + S * gainPerPoint)      — 3x rotation at S=200 with the default gain
 *   recommended  = (target / R0 - 1) / gainPerPoint, clamped to [min, max]
 *
 * When enough verified measured points exist for a device, a measured response curve
 * (linear interpolation between measured points) replaces the assumed linear model.
 */

export interface RotationConfig {
  /** Rotations the recommendation aims for (default 14). */
  targetRotation: number;
  minSensitivity: number;
  maxSensitivity: number;
  /** Rotation gain per sensitivity point; 0.01 gives 1x at 0, 2x at 100, 3x at 200. */
  gainPerPoint: number;
  model: 'linear';
  version: string;
}

export const DEFAULT_ROTATION_CONFIG: RotationConfig = {
  targetRotation: 14,
  minSensitivity: 0,
  maxSensitivity: 200,
  gainPerPoint: 0.01,
  model: 'linear',
  version: 'rotation-v1',
};

export type RotationStatus = 'ok' | 'already-at-target' | 'unreachable';

export interface RotationResult {
  zeroRotation: number;
  targetRotation: number;
  /** Final recommended General Sensitivity (integer, within [min, max]). */
  recommended: number;
  /** Unclamped calculated value before rounding and limits. */
  rawRecommended: number;
  /** Predicted rotations at the recommended sensitivity. */
  predictedRotation: number;
  /** Predicted rotations at the maximum sensitivity. */
  maxPredictedRotation: number;
  reachable: boolean;
  status: RotationStatus;
  /** 'linear-assumption' or 'measured-curve'. */
  model: string;
  configVersion: string;
}

export class RotationInputError extends Error {}

/** Sensible bounds for a player-measured zero sensitivity rotation. */
export const ZERO_ROTATION_MIN = 1;
export const ZERO_ROTATION_MAX = 99.9;

export function validateZeroRotation(value: unknown): number {
  const v = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(v) || v <= 0) throw new RotationInputError('Enter the rotations your phone makes at General 0.');
  if (v < ZERO_ROTATION_MIN || v > ZERO_ROTATION_MAX) {
    throw new RotationInputError(`Rotations must be between ${ZERO_ROTATION_MIN} and ${ZERO_ROTATION_MAX}.`);
  }
  return Math.round(v * 10) / 10;
}

export function predictedRotationAt(zeroRotation: number, sensitivity: number, cfg: RotationConfig): number {
  return zeroRotation * (1 + sensitivity * cfg.gainPerPoint);
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Linear model: sensitivity needed to reach the target rotation. */
export function calculateGeneralSensitivity(zeroRotation: number, cfg: RotationConfig = DEFAULT_ROTATION_CONFIG): RotationResult {
  const r0 = validateZeroRotation(zeroRotation);
  const maxPredicted = predictedRotationAt(r0, cfg.maxSensitivity, cfg);

  if (r0 >= cfg.targetRotation) {
    return {
      zeroRotation: r0,
      targetRotation: cfg.targetRotation,
      recommended: cfg.minSensitivity,
      rawRecommended: 0,
      predictedRotation: round2(predictedRotationAt(r0, cfg.minSensitivity, cfg)),
      maxPredictedRotation: round2(maxPredicted),
      reachable: true,
      status: 'already-at-target',
      model: 'linear-assumption',
      configVersion: cfg.version,
    };
  }

  if (maxPredicted < cfg.targetRotation) {
    return {
      zeroRotation: r0,
      targetRotation: cfg.targetRotation,
      recommended: cfg.maxSensitivity,
      rawRecommended: cfg.maxSensitivity,
      predictedRotation: round2(maxPredicted),
      maxPredictedRotation: round2(maxPredicted),
      reachable: false,
      status: 'unreachable',
      model: 'linear-assumption',
      configVersion: cfg.version,
    };
  }

  const raw = (cfg.targetRotation / r0 - 1) / cfg.gainPerPoint;
  const recommended = Math.max(cfg.minSensitivity, Math.min(cfg.maxSensitivity, Math.round(raw)));
  return {
    zeroRotation: r0,
    targetRotation: cfg.targetRotation,
    recommended,
    rawRecommended: round2(raw),
    predictedRotation: round2(predictedRotationAt(r0, recommended, cfg)),
    maxPredictedRotation: round2(maxPredicted),
    reachable: true,
    status: 'ok',
    model: 'linear-assumption',
    configVersion: cfg.version,
  };
}

/** One verified measured point on the rotation response curve. */
export interface CurvePoint {
  sensitivity: number;
  rotation: number;
}

/** Minimum verified points (at distinct slider values) before the measured curve is used. */
export const MIN_CURVE_POINTS = 3;

/**
 * Sensitivity for the target rotation from measured points (linear interpolation).
 * Returns null when the target lies outside the measured range.
 */
export function sensitivityFromCurve(points: CurvePoint[], targetRotation: number): number | null {
  const sorted = [...points].sort((a, b) => a.sensitivity - b.sensitivity);
  if (sorted.length < 2) return null;
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  if (targetRotation <= first.rotation) return first.sensitivity;
  if (targetRotation > last.rotation) return null;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (targetRotation <= cur.rotation) {
      const span = cur.rotation - prev.rotation;
      if (span <= 0) return cur.sensitivity;
      const t = (targetRotation - prev.rotation) / span;
      return prev.sensitivity + t * (cur.sensitivity - prev.sensitivity);
    }
  }
  return null;
}

/**
 * Measured-curve variant of the calculation. Used only when enough verified
 * measurements exist for the device; otherwise the linear assumption runs.
 */
export function calculateFromCurve(zeroRotation: number, points: CurvePoint[], cfg: RotationConfig): RotationResult | null {
  const r0 = validateZeroRotation(zeroRotation);
  if (points.length < MIN_CURVE_POINTS) return null;
  const sorted = [...points].sort((a, b) => a.sensitivity - b.sensitivity);
  const maxMeasured = sorted[sorted.length - 1]!;
  const atTarget = sensitivityFromCurve(sorted, cfg.targetRotation);

  if (r0 >= cfg.targetRotation) {
    return {
      zeroRotation: r0,
      targetRotation: cfg.targetRotation,
      recommended: cfg.minSensitivity,
      rawRecommended: 0,
      predictedRotation: round2(r0),
      maxPredictedRotation: round2(maxMeasured.rotation),
      reachable: true,
      status: 'already-at-target',
      model: 'measured-curve',
      configVersion: cfg.version,
    };
  }
  if (atTarget === null) {
    return {
      zeroRotation: r0,
      targetRotation: cfg.targetRotation,
      recommended: cfg.maxSensitivity,
      rawRecommended: cfg.maxSensitivity,
      predictedRotation: round2(maxMeasured.rotation),
      maxPredictedRotation: round2(maxMeasured.rotation),
      reachable: false,
      status: 'unreachable',
      model: 'measured-curve',
      configVersion: cfg.version,
    };
  }
  const recommended = Math.max(cfg.minSensitivity, Math.min(cfg.maxSensitivity, Math.round(atTarget)));
  const predicted = sensitivityFromCurve(sorted, cfg.targetRotation) !== null ? cfg.targetRotation : maxMeasured.rotation;
  return {
    zeroRotation: r0,
    targetRotation: cfg.targetRotation,
    recommended,
    rawRecommended: round2(atTarget),
    predictedRotation: round2(predicted),
    maxPredictedRotation: round2(maxMeasured.rotation),
    reachable: true,
    status: 'ok',
    model: 'measured-curve',
    configVersion: cfg.version,
  };
}

/**
 * Replaces the General value in a recommendation with the rotation result,
 * so every surface (core grid, settings list, copy-all, saved snapshot) agrees.
 */
export function applyRotationToRecommendation<
  T extends {
    core: { id: string; value: number }[];
    groups: { settings: { key: string; value: number | null }[] }[];
    analysis?: { settings: { key: string; suggested: number }[] };
  },
>(rec: T, rotation: RotationResult): T {
  return {
    ...rec,
    core: rec.core.map((c) => (c.id === 'general' ? { ...c, value: rotation.recommended } : c)),
    groups: rec.groups.map((g) => ({
      ...g,
      settings: g.settings.map((s) => (s.key === 'general' ? { ...s, value: rotation.recommended } : s)),
    })),
    ...(rec.analysis
      ? {
          analysis: {
            ...rec.analysis,
            settings: rec.analysis.settings.map((s) => (s.key === 'general' ? { ...s, suggested: rotation.recommended } : s)),
          },
        }
      : {}),
  };
}
