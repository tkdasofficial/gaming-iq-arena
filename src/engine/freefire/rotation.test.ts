import { describe, expect, it } from 'vitest';
import {
  applyRotationToRecommendation,
  calculateFromCurve,
  calculateGeneralSensitivity,
  DEFAULT_ROTATION_CONFIG,
  predictedRotationAt,
  sensitivityFromCurve,
  validateZeroRotation,
} from './rotation';
import { componentPoint, componentProfile, POINT_MAX, POINT_MIN, type ComponentPointRule } from './component-points';

const cfg = DEFAULT_ROTATION_CONFIG; // target 14, range 0–200, 3x at 200

describe('linear model', () => {
  it('predicts 1x at 0, 2x at 100, 3x at 200', () => {
    expect(predictedRotationAt(5, 0, cfg)).toBe(5);
    expect(predictedRotationAt(5, 100, cfg)).toBe(10);
    expect(predictedRotationAt(5, 200, cfg)).toBe(15);
  });
});

describe('reference examples from the brief', () => {
  it('zero rotation 3 → 200, target unreachable (9 at max)', () => {
    const r = calculateGeneralSensitivity(3, cfg);
    expect(r.recommended).toBe(200);
    expect(r.reachable).toBe(false);
    expect(r.status).toBe('unreachable');
    expect(r.maxPredictedRotation).toBe(9);
  });

  it('zero rotation 4 → 200, target unreachable (12 at max)', () => {
    const r = calculateGeneralSensitivity(4, cfg);
    expect(r.recommended).toBe(200);
    expect(r.reachable).toBe(false);
    expect(r.maxPredictedRotation).toBe(12);
  });

  it('zero rotation 4.67 → about 200', () => {
    const r = calculateGeneralSensitivity(4.67, cfg);
    expect(r.recommended).toBeGreaterThanOrEqual(195);
    expect(r.recommended).toBeLessThanOrEqual(200);
  });

  it('zero rotation 6 → about 133', () => {
    expect(calculateGeneralSensitivity(6, cfg).recommended).toBe(133);
  });

  it('zero rotation 9 → about 56', () => {
    expect(calculateGeneralSensitivity(9, cfg).recommended).toBe(56);
  });

  it('zero rotation 9.5 → about 47, never arbitrarily 76', () => {
    const r = calculateGeneralSensitivity(9.5, cfg);
    expect(r.recommended).toBe(47);
    expect(r.predictedRotation).toBeCloseTo(13.96, 1);
  });

  it('zero rotation 10 → about 40', () => {
    expect(calculateGeneralSensitivity(10, cfg).recommended).toBe(40);
  });
});

describe('limits and edge cases', () => {
  it('target already reached at sensitivity 0 → recommends 0', () => {
    const r = calculateGeneralSensitivity(14, cfg);
    expect(r.recommended).toBe(0);
    expect(r.status).toBe('already-at-target');
    expect(r.reachable).toBe(true);
  });

  it('target exceeded at sensitivity 0 → recommends 0', () => {
    const r = calculateGeneralSensitivity(20, cfg);
    expect(r.recommended).toBe(0);
    expect(r.status).toBe('already-at-target');
  });

  it('never returns above 200 or below 0', () => {
    expect(calculateGeneralSensitivity(1, cfg).recommended).toBeLessThanOrEqual(200);
    expect(calculateGeneralSensitivity(99.9, cfg).recommended).toBeGreaterThanOrEqual(0);
  });

  it('rejects zero, negative, non-numeric and out-of-range input', () => {
    expect(() => validateZeroRotation(0)).toThrow();
    expect(() => validateZeroRotation(-3)).toThrow();
    expect(() => validateZeroRotation(NaN)).toThrow();
    expect(() => validateZeroRotation(0.5)).toThrow();
    expect(() => validateZeroRotation(100)).toThrow();
  });

  it('accepts decimal rotations and rounds to one decimal', () => {
    expect(validateZeroRotation(9.5)).toBe(9.5);
    expect(validateZeroRotation(4.67)).toBe(4.7);
  });

  it('respects a different configured target', () => {
    const custom = { ...cfg, targetRotation: 10, version: 'test' };
    expect(calculateGeneralSensitivity(5, custom).recommended).toBe(100);
  });
});

describe('measured response curve', () => {
  const points = [
    { sensitivity: 0, rotation: 5 },
    { sensitivity: 100, rotation: 10 },
    { sensitivity: 200, rotation: 15 },
  ];

  it('interpolates between measured points', () => {
    expect(sensitivityFromCurve(points, 14)).toBe(180);
  });

  it('returns the lowest point when the target is below the first measurement', () => {
    expect(sensitivityFromCurve(points, 4)).toBe(0);
  });

  it('returns null when the target is above the measured range', () => {
    expect(sensitivityFromCurve(points, 16)).toBeNull();
  });

  it('needs at least 3 points before replacing the linear model', () => {
    expect(calculateFromCurve(5, points.slice(0, 2), cfg)).toBeNull();
    expect(calculateFromCurve(5, points, cfg)?.model).toBe('measured-curve');
  });

  it('marks the target unreachable when measurements stop below it', () => {
    const low = [
      { sensitivity: 0, rotation: 2 },
      { sensitivity: 100, rotation: 4 },
      { sensitivity: 200, rotation: 6 },
    ];
    const r = calculateFromCurve(2, low, cfg);
    expect(r?.reachable).toBe(false);
    expect(r?.recommended).toBe(200);
  });
});

describe('component points (inverse rule)', () => {
  const rule: ComponentPointRule = {
    componentId: 'cpu_single',
    minBenchmark: 300,
    maxBenchmark: 3000,
    minPoint: 1,
    maxPoint: 200,
    weight: 1,
    method: 'linear-inverse',
    enabled: true,
    ruleVersion: 'points-v1',
  };

  it('higher quality produces a lower point', () => {
    expect(componentPoint(3000, rule)).toBe(POINT_MIN);
    expect(componentPoint(300, rule)).toBe(POINT_MAX);
    expect(componentPoint(2000, rule)).toBeLessThan(componentPoint(800, rule));
  });

  it('points never go below 1 or above 200, even out of range', () => {
    expect(componentPoint(99999, rule)).toBe(POINT_MIN);
    expect(componentPoint(0, rule)).toBe(POINT_MAX);
  });

  it('linear method: higher value means worse, so a higher point (touch latency)', () => {
    const latency: ComponentPointRule = { ...rule, componentId: 'touch_latency', minBenchmark: 10, maxBenchmark: 150, method: 'linear' };
    expect(componentPoint(10, latency)).toBe(POINT_MIN);
    expect(componentPoint(150, latency)).toBe(POINT_MAX);
  });

  it('missing readings stay missing; disabled rules are ignored', () => {
    const res = componentProfile([{ componentId: 'cpu_single', value: 1650, confidence: 0.8 }], [rule, { ...rule, componentId: 'gpu', enabled: false }]);
    expect(res.points).toHaveLength(1);
    expect(res.coverage).toBe(1);
    expect(res.weightedAverage).toBe(res.points[0]!.point);
  });

  it('no readings → null average, zero coverage, never a fake zero point', () => {
    const res = componentProfile([], [rule]);
    expect(res.points).toHaveLength(0);
    expect(res.weightedAverage).toBeNull();
    expect(res.coverage).toBe(0);
  });
});

describe('applyRotationToRecommendation', () => {
  it('replaces only the General value everywhere it appears', () => {
    const rec = {
      core: [
        { id: 'general', value: 120 },
        { id: 'redDot', value: 130 },
      ],
      groups: [{ settings: [{ key: 'general', value: 120 }, { key: 'red-dot', value: 130 }] }],
      analysis: { settings: [{ key: 'general', suggested: 120 }, { key: 'redDot', suggested: 130 }] },
    };
    const out = applyRotationToRecommendation(rec, calculateGeneralSensitivity(9.5, cfg));
    expect(out.core[0]!.value).toBe(47);
    expect(out.core[1]!.value).toBe(130);
    expect(out.groups[0]!.settings[0]!.value).toBe(47);
    expect(out.groups[0]!.settings[1]!.value).toBe(130);
    expect(out.analysis!.settings[0]!.suggested).toBe(47);
    expect(out.analysis!.settings[1]!.suggested).toBe(130);
  });
});
