import { describe, expect, it } from 'vitest';
import { EMPTY_ROTATION_FORM, rotationFormComplete, rotationFormFrom } from './RotationCalibrationForm';

describe('required rotation step', () => {
  it('is incomplete without phone age', () => {
    expect(rotationFormComplete({ deviceAge: '', whole: '9', digit: '5' })).toBe(false);
  });
  it('is incomplete while rotations stay at the 0.0 default', () => {
    expect(rotationFormComplete({ deviceAge: '1-2-years' as never, whole: '0', digit: '0' })).toBe(false);
  });
  it('is incomplete when empty', () => {
    expect(rotationFormComplete(EMPTY_ROTATION_FORM)).toBe(false);
  });
  it('is complete with phone age and a rotation above 0.0', () => {
    expect(rotationFormComplete({ deviceAge: '1-2-years' as never, whole: '9', digit: '5' })).toBe(true);
  });
  it('restores 9.5 rotations as 9 and 5', () => {
    const v = rotationFormFrom('1-2-years', 9.5);
    expect(v.whole).toBe('9');
    expect(v.digit).toBe('5');
  });
});
