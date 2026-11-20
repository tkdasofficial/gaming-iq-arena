/**
 * Response-curve calibration. For one setting, M_s(v) is the median measured movement at
 * slider value v across repetitions. Each tested value gets a loss
 *   L_s(v) = w1·movementError + w2·overshoot + w3·undershoot + w4·instability + w5·timeToTarget
 * (all terms dimensionless) and the best-supported value is v* = argmin L_s(v).
 */
import type { LossTerm, ModelConfig, SettingConfig, StaleKey } from './config';
import { LOSS_TERMS } from './config';
import { median, round2 } from './normalize';

export interface CalibrationRun {
  sliderValue: number;
  repetition: number;
  targetMovement: number;
  measuredMovement: number;
  overshoot: number | null;
  undershoot: number | null;
  instability: number | null;
  timeToTargetMs: number | null;
}

export interface CalibrationSession {
  id: string;
  createdAt: string;
  conditions: Partial<Record<StaleKey, string | number | null>>;
  runs: CalibrationRun[];
}

export interface CurvePoint {
  sliderValue: number;
  repetitions: number;
  medianMeasured: number;
  medianTarget: number;
  medianOvershoot: number | null;
  medianUndershoot: number | null;
  medianInstability: number | null;
  medianTimeMs: number | null;
  /** Measured spread (median absolute deviation) used when instability wasn't recorded. */
  spread: number;
}

export type CalibrationStatus = 'calibrated' | 'stale' | 'insufficient_data' | 'not_calibrated';

export interface CalibrationResult {
  status: CalibrationStatus;
  best: number | null;
  curve: CurvePoint[];
  losses: { sliderValue: number; loss: number }[];
  staleBecause: StaleKey[];
  sessionsUsed: number;
}

const nonNull = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null && Number.isFinite(x));

export function buildResponseCurve(runs: CalibrationRun[]): CurvePoint[] {
  const groups = new Map<number, CalibrationRun[]>();
  for (const r of runs) {
    if (!Number.isFinite(r.sliderValue) || !(r.targetMovement > 0) || !Number.isFinite(r.measuredMovement)) continue;
    groups.set(r.sliderValue, [...(groups.get(r.sliderValue) ?? []), r]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([v, rs]) => {
      const measured = rs.map((r) => r.measuredMovement);
      const med = median(measured) as number;
      return {
        sliderValue: v,
        repetitions: rs.length,
        medianMeasured: med,
        medianTarget: median(rs.map((r) => r.targetMovement)) as number,
        medianOvershoot: median(nonNull(rs.map((r) => r.overshoot))),
        medianUndershoot: median(nonNull(rs.map((r) => r.undershoot))),
        medianInstability: median(nonNull(rs.map((r) => r.instability))),
        medianTimeMs: median(nonNull(rs.map((r) => r.timeToTargetMs))),
        spread: median(measured.map((x) => Math.abs(x - med))) ?? 0,
      };
    });
}

/** Dimensionless loss terms for one curve point (null when that measurement is missing). */
export function lossTerms(p: CurvePoint, timeReferenceMs: number): Record<LossTerm, number | null> {
  const t = p.medianTarget;
  return {
    movementError: Math.abs(p.medianMeasured - t) / t,
    overshoot: p.medianOvershoot === null ? null : p.medianOvershoot / t,
    undershoot: p.medianUndershoot === null ? null : p.medianUndershoot / t,
    instability: (p.medianInstability ?? p.spread) / t,
    timeToTarget: p.medianTimeMs === null ? null : p.medianTimeMs / timeReferenceMs,
  };
}

/**
 * Loss for each eligible point. A term missing at any eligible point is dropped for all points
 * (so values are compared on the same terms) and the remaining weights are re-normalised.
 */
export function computeLosses(points: CurvePoint[], weights: Record<LossTerm, number>, timeReferenceMs: number) {
  const terms = points.map((p) => lossTerms(p, timeReferenceMs));
  const usable = LOSS_TERMS.filter((k) => weights[k] > 0 && terms.every((t) => t[k] !== null));
  const total = usable.reduce((s, k) => s + weights[k], 0);
  if (total === 0) return [];
  return points.map((p, i) => ({
    sliderValue: p.sliderValue,
    loss: round2(usable.reduce((s, k) => s + (weights[k] / total) * (terms[i]?.[k] as number), 0) * 1000) / 1000,
  }));
}

/** v* = argmin L. Ties go to the value nearest the preliminary suggestion. */
export function selectBest(losses: { sliderValue: number; loss: number }[], tieBreakTowards: number): number | null {
  let bestV: number | null = null;
  let bestL = Infinity;
  for (const { sliderValue, loss } of losses) {
    if (loss < bestL - 1e-9 || (Math.abs(loss - bestL) <= 1e-9 && bestV !== null && Math.abs(sliderValue - tieBreakTowards) < Math.abs(bestV - tieBreakTowards))) {
      bestV = sliderValue;
      bestL = loss;
    }
  }
  return bestV;
}

/** A session is stale when a recorded test condition differs from the player's current one. */
export function staleConditions(
  recorded: CalibrationSession['conditions'],
  current: CalibrationSession['conditions'],
  keys: readonly StaleKey[]
): StaleKey[] {
  return keys.filter((k) => {
    const a = recorded[k];
    const b = current[k];
    return a !== null && a !== undefined && b !== null && b !== undefined && String(a) !== String(b);
  });
}

export function evaluateCalibration(
  sessions: CalibrationSession[],
  current: CalibrationSession['conditions'],
  setting: SettingConfig,
  cfg: ModelConfig,
  preliminary: number
): CalibrationResult {
  if (sessions.length === 0) return { status: 'not_calibrated', best: null, curve: [], losses: [], staleBecause: [], sessionsUsed: 0 };
  const staleBecause = new Set<StaleKey>();
  const fresh = sessions.filter((s) => {
    const changed = staleConditions(s.conditions, current, cfg.calibration.staleWhenChanged);
    changed.forEach((c) => staleBecause.add(c));
    return changed.length === 0;
  });
  if (fresh.length === 0) return { status: 'stale', best: null, curve: [], losses: [], staleBecause: [...staleBecause], sessionsUsed: 0 };

  const runs = fresh.flatMap((s) => s.runs).filter((r) => r.sliderValue >= cfg.slider.min && r.sliderValue <= cfg.slider.max);
  const curve = buildResponseCurve(runs);
  const eligible = curve.filter((p) => p.repetitions >= cfg.calibration.minRepetitions);
  const losses = computeLosses(eligible, setting.loss, cfg.calibration.timeReferenceMs);
  if (eligible.length < cfg.calibration.minPoints || losses.length === 0) {
    return { status: 'insufficient_data', best: null, curve, losses, staleBecause: [...staleBecause], sessionsUsed: fresh.length };
  }
  return { status: 'calibrated', best: selectBest(losses, preliminary), curve, losses, staleBecause: [...staleBecause], sessionsUsed: fresh.length };
}
