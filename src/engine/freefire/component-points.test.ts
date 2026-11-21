import { describe, expect, it } from 'vitest';
import { componentPoint, componentProfile, POINT_MAX, POINT_MIN, type ComponentPointRule } from './component-points';

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
