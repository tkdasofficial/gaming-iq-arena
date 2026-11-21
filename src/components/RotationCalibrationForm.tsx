import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ChevronDown } from 'lucide-react';
import { getRotationCalibration } from '../backend/rotation.functions';
import { DEVICE_AGES, type DeviceAge } from '../backend/rotation.core';

export interface RotationFormValue {
  deviceAge: DeviceAge | '';
  /** Whole rotations, 1–99 ('' = not chosen). */
  whole: string;
  /** Decimal digit, 1–9 ('' = not chosen). */
  digit: string;
}

export const EMPTY_ROTATION_FORM: RotationFormValue = { deviceAge: '', whole: '', digit: '' };

export const rotationFormComplete = (v: RotationFormValue) => Boolean(v.deviceAge && v.whole && v.digit);

const selectCls = 'h-10 w-full rounded-lg border border-input bg-card px-2.5 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const WHOLE_OPTIONS = Array.from({ length: 99 }, (_, i) => i + 1);
const DIGIT_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 1);

/**
 * Optional Free Fire rotation test: device age + zero-sensitivity rotations as two
 * side-by-side dropdowns (1–99 and 1–9, combined as e.g. 9.5). Signed-in players
 * get their saved answers prefilled.
 */
export function RotationCalibrationForm({
  deviceId,
  gameId,
  signedIn,
  value,
  onChange,
}: {
  deviceId: string;
  gameId: string;
  signedIn: boolean;
  value: RotationFormValue;
  onChange: (v: RotationFormValue | ((current: RotationFormValue) => RotationFormValue)) => void;
}) {
  const load = useServerFn(getRotationCalibration);
  const saved = useQuery({
    queryKey: ['rotation-calibration', deviceId, gameId],
    queryFn: () => load({ data: { deviceId, gameId } }),
    enabled: signedIn,
    staleTime: 60_000,
  });

  // Prefill from the saved calibration once it loads (only when the form is untouched).
  useEffect(() => {
    const s = saved.data;
    if (!s) return;
    onChange((current) => {
      if (current.deviceAge || current.whole || current.digit) return current;
      const whole = Math.floor(s.zeroRotation);
      const digit = Math.round((s.zeroRotation - whole) * 10);
      return { deviceAge: s.deviceAge, whole: String(whole), digit: digit >= 1 ? String(digit) : '' };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.data]);

  const set = (patch: Partial<RotationFormValue>) => onChange({ ...value, ...patch });
  const complete = rotationFormComplete(value);

  return (
    <details className="group rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-[13px] font-medium">
            Rotation test <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {complete ? 'General will be calculated from your test' : 'One swipe test makes General exact for your phone'}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-3 px-3 pb-3">
        <p className="rounded-lg bg-secondary px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
          In Free Fire, set <span className="font-medium text-foreground">General to 0</span>. Swipe once from one edge of the
          screen to the other and count how many full turns the camera makes. Repeat 3–5 times and enter the average.
        </p>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground">How old is your phone?</span>
          <select className={selectCls} value={value.deviceAge} onChange={(e) => set({ deviceAge: e.target.value as DeviceAge | '' })}>
            <option value="">Choose…</option>
            {DEVICE_AGES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Rotations at General 0</span>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <select aria-label="Whole rotations" className={selectCls} value={value.whole} onChange={(e) => set({ whole: e.target.value })}>
              <option value="">Whole</option>
              {WHOLE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-lg font-medium text-muted-foreground" aria-hidden>
              .
            </span>
            <select aria-label="Decimal part" className={selectCls} value={value.digit} onChange={(e) => set({ digit: e.target.value })}>
              <option value="">Decimal</option>
              {DIGIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {value.whole && value.digit ? `${value.whole}.${value.digit} rotations` : 'Example: 9 whole and 5 decimal = 9.5 rotations'}
          </p>
        </div>
      </div>
    </details>
  );
}
