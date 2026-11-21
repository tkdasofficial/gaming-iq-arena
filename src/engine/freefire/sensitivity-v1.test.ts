import { describe, expect, it } from 'vitest';
import { applyFreeFireV1, calculateFreeFireRaw, calculateFreeFireSensitivity, INVALID_ROTATION_MESSAGE, summarizeFreeFireV1 } from './sensitivity-v1';

describe('Free Fire Version 1 model', () => {
  it('mandatory test: R = 14 gives exactly 200 / 71 / 94 / 56 / 19 / 68', () => {
    expect(calculateFreeFireSensitivity(14)).toEqual({ general: 200, redDot: 71, scope2x: 94, scope4x: 56, sniper: 19, freeLook: 68 });
  });

  it('R = 14 intermediate values are not rounded (scope factor 0.75, Red Dot 71.25)', () => {
    const { scopeFactor, values } = calculateFreeFireRaw(14);
    expect(scopeFactor).toBe(0.75);
    expect(values.redDot).toBe(71.25);
    expect(values.scope2x).toBe(93.75);
    expect(values.freeLook).toBeCloseTo(68.421, 3);
  });

  it('the Redmi 10C reference (R = 10.5) reproduces its own scope profile', () => {
    const v = calculateFreeFireSensitivity(10.5);
    expect(v).toMatchObject({ general: 200, redDot: 95, scope2x: 125, scope4x: 75, sniper: 25 });
  });

  it('General = 2800 / R when below 200 (R = 28 → 100), Free Look uses that General (34)', () => {
    const v = calculateFreeFireSensitivity(28);
    expect(v.general).toBe(100);
    expect(v.freeLook).toBe(34);
    expect(v.redDot).toBe(36); // 95 × 0.375 = 35.625
  });

  it('General is capped at 200 when 2800 / R is larger (R = 7 → 200)', () => {
    expect(calculateFreeFireSensitivity(7).general).toBe(200);
    expect(summarizeFreeFireV1(7).generalCapped).toBe(true);
    expect(summarizeFreeFireV1(28).generalCapped).toBe(false);
  });

  it('every value is clamped to 200 independently (R = 2 → Red Dot 95 × 5.25 = 498.75 → 200)', () => {
    const v = calculateFreeFireSensitivity(2);
    expect(v.redDot).toBe(200);
    expect(v.scope2x).toBe(200);
    expect(v.sniper).toBe(131); // 25 × 5.25 = 131.25
  });

  it.each([0, -3, Number.NaN, Number.POSITIVE_INFINITY, '14', null, undefined])('rejects %s without a default', (bad) => {
    expect(() => calculateFreeFireSensitivity(bad)).toThrow(INVALID_ROTATION_MESSAGE);
  });

  it('puts all six values into the headline grid and the settings list', () => {
    const rec = {
      core: [{ id: 'general', value: 1 }, { id: 'sniper', value: 1 }],
      groups: [{ settings: [{ key: 'red-dot', value: 1 }, { key: 'free-look', value: 1 }, { key: 'other', value: 9 }] }],
    };
    const out = applyFreeFireV1(rec, calculateFreeFireSensitivity(14));
    expect(out.core.map((c) => c.value)).toEqual([200, 19]);
    expect(out.groups[0]!.settings.map((s) => s.value)).toEqual([71, 68, 9]);
  });
});
