import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getRotationCalibration } from '../backend/rotation.functions';
import { DEVICE_AGES, type DeviceAge } from '../backend/rotation.core';
import { StepLabel } from './giq/primitives';

export interface RotationFormValue {
  deviceAge: DeviceAge | '';
  /** Whole rotations, 0–99 (defaults to '0'). */
  whole: string;
  /** Decimal digit, 0–9 (defaults to '0'). */
  digit: string;
}

export const EMPTY_ROTATION_FORM: RotationFormValue = { deviceAge: '', whole: '0', digit: '0' };

/** Complete when a phone age is chosen and the combined rotation is above 0.0 (0.0 = not entered). */
export const rotationFormComplete = (v: RotationFormValue) => Boolean(v.deviceAge) && Number(v.whole) + Number(v.digit) / 10 > 0;

/** Rebuild the form from a stored General 200 rotation count (e.g. 9.5 → 9 + 5). */
export function rotationFormFrom(deviceAge: string | undefined, rotation: number | undefined): RotationFormValue {
  if (!deviceAge || !rotation || !DEVICE_AGES.some((a) => a.id === deviceAge)) return EMPTY_ROTATION_FORM;
  const whole = Math.floor(rotation);
  const digit = Math.round((rotation - whole) * 10);
  return { deviceAge: deviceAge as DeviceAge, whole: String(whole), digit: digit >= 0 && digit <= 9 ? String(digit) : '0' };
}

const selectCls =
  'h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const WHOLE_OPTIONS = Array.from({ length: 100 }, (_, i) => i);
const DIGIT_OPTIONS = Array.from({ length: 10 }, (_, i) => i);

/** The rotation test is a Free Fire swipe test, so saved answers are stored against Free Fire. */
const ROTATION_GAME_ID = 'free-fire';

/**
 * Required steps after the model: phone age, then the General 200 rotation test as two
 * side-by-side dropdowns (0–99 and 0–9, both defaulting to 0, combined as e.g. 9.5). Locked until a model is picked;
 * signed-in players get their saved answers prefilled.
 */
export function RotationCalibrationForm({
  deviceId,
  signedIn,
  value,
  onChange,
  startStep,
}: {
  deviceId: string;
  signedIn: boolean;
  value: RotationFormValue;
  onChange: (v: RotationFormValue | ((current: RotationFormValue) => RotationFormValue)) => void;
  startStep: number;
}) {
  const load = useServerFn(getRotationCalibration);
  const saved = useQuery({
    queryKey: ['rotation-calibration', deviceId, ROTATION_GAME_ID],
    queryFn: () => load({ data: { deviceId, gameId: ROTATION_GAME_ID } }),
    enabled: signedIn && Boolean(deviceId),
    staleTime: 60_000,
  });

  // Prefill from the saved calibration once it loads (only when the form is untouched).
  useEffect(() => {
    const s = saved.data;
    if (!s) return;
    onChange((current) => (current.deviceAge ? current : rotationFormFrom(s.deviceAge, s.general200Rotation)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.data]);

  const locked = !deviceId;
  const set = (patch: Partial<RotationFormValue>) => onChange({ ...value, ...patch });

  return (
    <>
      <div>
        <StepLabel step={startStep} htmlFor="device-age">
          Phone age
        </StepLabel>
        <select id="device-age" required disabled={locked} className={selectCls} value={value.deviceAge} onChange={(e) => set({ deviceAge: e.target.value as DeviceAge | '' })}>
          <option value="">{locked ? 'Select a model first' : 'How old is your phone?'}</option>
          {DEVICE_AGES.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <StepLabel step={startStep + 1} htmlFor="rotation-whole">
          Rotations
        </StepLabel>
        <p className="mb-2 rounded-lg bg-secondary px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
          In Free Fire, set <span className="font-medium text-foreground">General to 200</span>. Swipe once from one edge of the screen to the
          other and count how many full turns the camera makes. Repeat 3–5 times and enter the average.
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <select id="rotation-whole" required disabled={locked} aria-label="Whole rotations" className={selectCls} value={value.whole} onChange={(e) => set({ whole: e.target.value })}>
            {WHOLE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-lg font-medium text-muted-foreground" aria-hidden>
            .
          </span>
          <select required disabled={locked} aria-label="Decimal part" className={selectCls} value={value.digit} onChange={(e) => set({ digit: e.target.value })}>
            {DIGIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {Number(value.whole) + Number(value.digit) / 10 > 0 ? `${value.whole}.${value.digit} rotations at General 200` : 'Example: 9 whole and 5 decimal = 9.5 rotations'}
        </p>
      </div>
    </>
  );
}
