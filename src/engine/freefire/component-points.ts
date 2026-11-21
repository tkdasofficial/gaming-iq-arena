/**
 * Component quality points (pure, runs on the server).
 *
 * A separate, bounded supporting layer next to the rotation-based General Sensitivity
 * calculation. Points describe hardware quality; they do NOT modify the recommended
 * sensitivity — the rotation calibration stays the primary source until a documented,
 * testable calibration method exists.
 *
 * Mandatory inverse rule: higher component quality produces a LOWER point.
 * Points are always within [1, 200] — never 0, never above 200.
 */

export const POINT_MIN = 1;
export const POINT_MAX = 200;

export type NormalizationMethod = 'linear-inverse' | 'linear';

export interface ComponentPointRule {
  componentId: string;
  /** Benchmark range used for normalization (raw scales differ per component). */
  minBenchmark: number;
  maxBenchmark: number;
  minPoint: number;
  maxPoint: number;
  /** Relative importance when summarising; 0 excludes the component from the summary. */
  weight: number;
  /**
   * 'linear-inverse': higher benchmark = higher quality = lower point (CPU, GPU, RAM, FPS…).
   * 'linear': higher benchmark = worse = higher point (touch latency…).
   */
  method: NormalizationMethod;
  enabled: boolean;
  ruleVersion: string;
}

export interface ComponentReading {
  componentId: string;
  value: number;
  confidence: number | null;
}

export interface ComponentPoint {
  componentId: string;
  value: number;
  point: number;
  confidence: number | null;
  ruleVersion: string;
}

export interface ComponentProfileResult {
  points: ComponentPoint[];
  /** Weighted average point across enabled components with data; null when none. */
  weightedAverage: number | null;
  /** Share of enabled rules that had a reading (0–1). */
  coverage: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Inverse point for one reading. Higher quality → lower point; always within [1, 200]. */
export function componentPoint(value: number, rule: ComponentPointRule): number {
  if (!Number.isFinite(value)) throw new Error('Benchmark value must be a number.');
  const span = rule.maxBenchmark - rule.minBenchmark;
  const q = span === 0 ? 0.5 : clamp((value - rule.minBenchmark) / span, 0, 1);
  const quality = rule.method === 'linear-inverse' ? q : 1 - q;
  const point = rule.maxPoint - quality * (rule.maxPoint - rule.minPoint);
  return clamp(Math.round(point), POINT_MIN, POINT_MAX);
}

/** Points for every enabled rule that has a reading. Missing data stays missing — never zeroed. */
export function componentProfile(readings: ComponentReading[], rules: ComponentPointRule[]): ComponentProfileResult {
  const enabled = rules.filter((r) => r.enabled);
  const byComponent = new Map(readings.map((r) => [r.componentId, r]));
  const points: ComponentPoint[] = [];
  let weightSum = 0;
  let weighted = 0;
  for (const rule of enabled) {
    const reading = byComponent.get(rule.componentId);
    if (!reading || !Number.isFinite(reading.value)) continue;
    const point = componentPoint(reading.value, rule);
    points.push({ componentId: rule.componentId, value: reading.value, point, confidence: reading.confidence, ruleVersion: rule.ruleVersion });
    if (rule.weight > 0) {
      weightSum += rule.weight;
      weighted += point * rule.weight;
    }
  }
  return {
    points,
    weightedAverage: weightSum > 0 ? Math.round((weighted / weightSum) * 10) / 10 : null,
    coverage: enabled.length ? Math.round((points.length / enabled.length) * 100) / 100 : 0,
  };
}
