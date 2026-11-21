import { describe, expect, it } from 'vitest';
import { validateFreeFireInput } from './rotation.core';

const base = { deviceId: 'redmi-10c', gameId: 'free-fire', deviceAge: '1-2-years' };

describe('Free Fire rotation input (server)', () => {
  it('combines 9 and 5 into exactly 9.5 rotations at General 200', () => {
    expect(validateFreeFireInput({ ...base, wholeRotations: 9, decimalDigit: 5 }).general200Rotation).toBe(9.5);
  });
  it('accepts 0.5 (above zero)', () => {
    expect(validateFreeFireInput({ ...base, wholeRotations: 0, decimalDigit: 5 }).general200Rotation).toBe(0.5);
  });
  it('rejects 0.0 instead of using a default', () => {
    expect(() => validateFreeFireInput({ ...base, wholeRotations: 0, decimalDigit: 0 })).toThrow('Please enter a valid General 200 rotation count.');
  });
  it.each([[-1, 0], [100, 0], [5, 10], [5.5, 0], ['9', 5], [null, 0]])('rejects whole=%s decimal=%s', (w, d) => {
    expect(() => validateFreeFireInput({ ...base, wholeRotations: w, decimalDigit: d })).toThrow();
  });
  it('is for Free Fire only', () => {
    expect(() => validateFreeFireInput({ ...base, gameId: 'bgmi', wholeRotations: 14, decimalDigit: 0 })).toThrow();
  });
});
