import { Gauge, Settings2 } from 'lucide-react';
import { getSupportedFpsOptions } from '../engine/devices';
import type {
  BgmiPlaystyle,
  CalibrationInput,
  CameraPref,
  ClawStyle,
  FreeFirePlaystyle,
  GyroMode,
  Playstyle,
} from '../engine/types';
import { Disclosure, FieldLabel, OptionTile, Panel, RangeSlider, Segmented, TextField } from './giq/primitives';

interface GameplayPreferencesSectionProps {
  input: CalibrationInput;
  onChangeClaw: (claw: ClawStyle) => void;
  onChangePlaystyle: (playstyle: Playstyle) => void;
  onChangeGyro: (gyro: GyroMode) => void;
  onChangePreferredFps: (fps: string) => void;
  onChangeFireButtonSize: (size: number) => void;
  onChangeDpiOverride: (dpi: string) => void;
  onChangeCameraPref: (pref: CameraPref) => void;
  onChangeCurrentSensitivity: (val: string) => void;
}

const FREE_FIRE_PLAYSTYLES: { id: FreeFirePlaystyle; label: string }[] = [
  { id: 'aggressive-rush', label: 'Rush' },
  { id: 'headshot-focus', label: 'Headshot' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'sniper-focus', label: 'Sniper' },
];

const BGMI_PLAYSTYLES: { id: BgmiPlaystyle; label: string }[] = [
  { id: 'aggressive', label: 'Aggressive' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'tactical', label: 'Tactical' },
  { id: 'sniper-focus', label: 'Sniper' },
];

const CLAW_OPTIONS: { id: ClawStyle; label: string }[] = [
  { id: '2-finger', label: '2' },
  { id: '3-finger', label: '3' },
  { id: '4-finger', label: '4' },
  { id: '5-finger', label: '5' },
  { id: '6-finger', label: '6' },
];

const GYRO_OPTIONS: { id: GyroMode; label: string }[] = [
  { id: 'always-on', label: 'Always' },
  { id: 'scope-on', label: 'Scope' },
  { id: 'off', label: 'Off' },
];

const CAMERA_PREFS: { id: CameraPref; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

const fpsShort = (fps: string) => fps.replace(/ FPS.*$/, '').replace(/ \(.*\)/, '');

export function GameplayPreferencesSection({
  input,
  onChangeClaw,
  onChangePlaystyle,
  onChangeGyro,
  onChangePreferredFps,
  onChangeFireButtonSize,
  onChangeDpiOverride,
  onChangeCameraPref,
  onChangeCurrentSensitivity,
}: GameplayPreferencesSectionProps) {
  const isFreeFire = input.game === 'free-fire';
  const playstyles = isFreeFire ? FREE_FIRE_PLAYSTYLES : BGMI_PLAYSTYLES;
  const fpsOptions = getSupportedFpsOptions(input.device, input.game);
  const currentFps = fpsOptions.includes(input.preferredFps) ? input.preferredFps : fpsOptions[fpsOptions.length - 1];
  const fireSize = input.fireButtonSize ?? 46;

  return (
    <Panel step="03" title="Play style" meta={isFreeFire ? 'Free Fire layout' : 'BGMI layout'}>
      <div className="space-y-5">
        <div>
          <FieldLabel>Playstyle</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {playstyles.map((opt) => (
              <OptionTile key={opt.id} active={input.playstyle === opt.id} onClick={() => onChangePlaystyle(opt.id)}>
                {opt.label}
              </OptionTile>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel hint={`${input.claw.split('-')[0]} fingers`}>Fingers / claw</FieldLabel>
          <Segmented
            layoutId="claw"
            ariaLabel="Finger layout"
            options={CLAW_OPTIONS}
            value={input.claw}
            onChange={onChangeClaw}
          />
        </div>

        <div>
          <FieldLabel hint={currentFps}>Frame rate</FieldLabel>
          <Segmented
            layoutId="fps"
            ariaLabel="Preferred FPS"
            options={fpsOptions.map((f) => ({ id: f, label: fpsShort(f) }))}
            value={currentFps}
            onChange={onChangePreferredFps}
          />
        </div>

        {isFreeFire ? (
          <div>
            <FieldLabel htmlFor="ff-fire-button-size" hint={`${fireSize}%`}>
              Fire button size
            </FieldLabel>
            <div className="flex h-12 items-center rounded-xl border border-border bg-secondary px-4">
              <RangeSlider id="ff-fire-button-size" min={38} max={64} value={fireSize} onChange={onChangeFireButtonSize} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel>Gyroscope</FieldLabel>
              <Segmented layoutId="gyro" ariaLabel="Gyroscope" options={GYRO_OPTIONS} value={input.gyro} onChange={onChangeGyro} />
            </div>
            <div>
              <FieldLabel>Camera speed</FieldLabel>
              <Segmented
                layoutId="camera"
                ariaLabel="Camera sensitivity preference"
                options={CAMERA_PREFS}
                value={input.cameraPref ?? 'medium'}
                onChange={onChangeCameraPref}
              />
            </div>
          </div>
        )}

        <Disclosure title={isFreeFire ? 'Advanced · DPI & current sensitivity' : 'Advanced · current sensitivity'} icon={Settings2}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {isFreeFire ? (
              <div>
                <FieldLabel htmlFor="ff-dpi-optional">DPI</FieldLabel>
                <TextField
                  id="ff-dpi-optional"
                  type="number"
                  inputMode="numeric"
                  min={320}
                  max={1440}
                  value={input.dpiOverride ?? ''}
                  onChange={(e) => onChangeDpiOverride(e.target.value)}
                  placeholder="e.g. 540"
                  className="font-mono"
                />
              </div>
            ) : null}
            <div className={isFreeFire ? '' : 'sm:col-span-2'}>
              <FieldLabel htmlFor="current-sens-optional">Current sensitivity</FieldLabel>
              <div className="relative">
                <Gauge className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <TextField
                  id="current-sens-optional"
                  value={input.currentSensitivity ?? ''}
                  onChange={(e) => onChangeCurrentSensitivity(e.target.value)}
                  placeholder={isFreeFire ? 'General 185, Red Dot 175' : 'TPP 120%, Red Dot 55%'}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </Disclosure>
      </div>
    </Panel>
  );
}
