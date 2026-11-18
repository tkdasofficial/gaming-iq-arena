import { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders } from 'lucide-react';
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
  { id: 'aggressive-rush', label: 'Aggressive / Rush' },
  { id: 'headshot-focus', label: 'Headshot Focus' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'sniper-focus', label: 'Sniper Focus' },
];

const BGMI_PLAYSTYLES: { id: BgmiPlaystyle; label: string }[] = [
  { id: 'aggressive', label: 'Aggressive' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'tactical', label: 'Tactical' },
  { id: 'sniper-focus', label: 'Sniper Focus' },
];

const FREE_FIRE_CLAW: { id: ClawStyle; label: string }[] = [
  { id: '2-finger', label: '2 Fingers' },
  { id: '3-finger', label: '3 Fingers' },
  { id: '4-finger', label: '4 Fingers' },
  { id: '5-finger', label: '5 Fingers' },
  { id: '6-finger', label: '6 Fingers' },
];

const BGMI_CLAW: { id: ClawStyle; label: string }[] = [
  { id: '2-finger', label: '2 Finger' },
  { id: '3-finger', label: '3 Finger' },
  { id: '4-finger', label: '4 Finger Claw' },
  { id: '5-finger', label: '5 Finger Claw' },
  { id: '6-finger', label: '6 Finger Claw' },
];

const GYRO_OPTIONS: { id: GyroMode; label: string }[] = [
  { id: 'always-on', label: 'Always On' },
  { id: 'scope-on', label: 'Scope On' },
  { id: 'off', label: 'Off' },
];

const CAMERA_PREFS: { id: CameraPref; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

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
  const [showOptional, setShowOptional] = useState(false);

  const isFreeFire = input.game === 'free-fire';
  const playstyles = isFreeFire ? FREE_FIRE_PLAYSTYLES : BGMI_PLAYSTYLES;
  const clawOptions = isFreeFire ? FREE_FIRE_CLAW : BGMI_CLAW;
  const fpsOptions = getSupportedFpsOptions(input.device, input.game);
  const fireSize = input.fireButtonSize ?? 46;

  return (
    <section
      aria-labelledby="gameplay-prefs-heading"
      className="bg-[#141417] border border-[#29292F] rounded-xl p-4 sm:p-6 space-y-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-[#F0263C]" />
          <h2
            id="gameplay-prefs-heading"
            className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight"
          >
            Gameplay Preferences
          </h2>
        </div>
        <span className="text-xs font-medium text-[#71717A]">
          {isFreeFire ? 'Free Fire Layout' : 'BGMI Layout'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Playstyle */}
        <div>
          <span className="block text-xs font-medium text-[#A1A1AA] mb-2">
            Playstyle
          </span>
          <div className="grid grid-cols-2 gap-2">
            {playstyles.map((opt) => {
              const active = input.playstyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangePlaystyle(opt.id)}
                  aria-pressed={active}
                  className={`min-h-[44px] px-3 rounded-lg text-xs sm:text-sm font-semibold border transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#F0263C] border-[#F0263C] text-white'
                      : 'bg-[#111114] border-[#29292F] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Control Layout */}
        <div>
          <span className="block text-xs font-medium text-[#A1A1AA] mb-2">
            Control Layout
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {clawOptions.map((opt) => {
              const active = input.claw === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeClaw(opt.id)}
                  aria-pressed={active}
                  className={`min-h-[44px] px-2.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white border-white text-black'
                      : 'bg-[#111114] border-[#29292F] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conditional Game-Specific Secondary Preferences */}
      {isFreeFire ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label
              htmlFor="ff-preferred-fps"
              className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
            >
              Preferred FPS
            </label>
            <select
              id="ff-preferred-fps"
              value={
                fpsOptions.includes(input.preferredFps)
                  ? input.preferredFps
                  : fpsOptions[fpsOptions.length - 1]
              }
              onChange={(e) => onChangePreferredFps(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm font-mono text-white outline-none transition-colors"
            >
              {fpsOptions.map((fps) => (
                <option key={fps} value={fps}>
                  {fps}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="ff-fire-button-size"
                className="text-xs font-medium text-[#A1A1AA]"
              >
                Fire Button Size
              </label>
              <span className="font-mono text-sm font-bold text-white tabular-nums">
                {fireSize}%
              </span>
            </div>
            <div className="min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] flex items-center">
              <input
                id="ff-fire-button-size"
                type="range"
                min={38}
                max={64}
                value={fireSize}
                onChange={(e) => onChangeFireButtonSize(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #F0263C 0%, #F0263C ${
                    ((fireSize - 38) / 26) * 100
                  }%, #29292F ${((fireSize - 38) / 26) * 100}%, #29292F 100%)`,
                }}
                className="giq-slider"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div>
            <span className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
              Gyroscope
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {GYRO_OPTIONS.map((opt) => {
                const active = input.gyro === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeGyro(opt.id)}
                    aria-pressed={active}
                    className={`min-h-[44px] px-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#F0263C] border-[#F0263C] text-white'
                        : 'bg-[#111114] border-[#29292F] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="bgmi-preferred-fps"
              className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
            >
              Preferred FPS
            </label>
            <select
              id="bgmi-preferred-fps"
              value={
                fpsOptions.includes(input.preferredFps)
                  ? input.preferredFps
                  : fpsOptions[fpsOptions.length - 1]
              }
              onChange={(e) => onChangePreferredFps(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm font-mono text-white outline-none transition-colors"
            >
              {fpsOptions.map((fps) => (
                <option key={fps} value={fps}>
                  {fps}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
              Camera Sensitivity Preference
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {CAMERA_PREFS.map((opt) => {
                const active = (input.cameraPref ?? 'medium') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeCameraPref(opt.id)}
                    aria-pressed={active}
                    className={`min-h-[44px] px-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white border-white text-black'
                        : 'bg-[#111114] border-[#29292F] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Progressive Disclosure: Optional Tuning Inputs */}
      <div className="pt-2 border-t border-[#29292F]">
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          aria-expanded={showOptional}
          className="min-h-[40px] text-xs font-semibold text-[#A1A1AA] hover:text-white inline-flex items-center gap-1.5 transition-colors"
        >
          {showOptional ? (
            <ChevronUp className="w-4 h-4 text-[#F0263C]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#71717A]" />
          )}
          <span>
            {isFreeFire
              ? 'Optional Settings (DPI & Current Sensitivity)'
              : 'Optional Settings (Current Sensitivity)'}
          </span>
        </button>

        {showOptional ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isFreeFire ? (
              <div>
                <label
                  htmlFor="ff-dpi-optional"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  DPI (Optional)
                </label>
                <input
                  id="ff-dpi-optional"
                  type="number"
                  min={320}
                  max={1440}
                  value={input.dpiOverride ?? ''}
                  onChange={(e) => onChangeDpiOverride(e.target.value)}
                  placeholder="e.g. 540"
                  className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm font-mono text-white placeholder-[#71717A] outline-none transition-colors"
                />
              </div>
            ) : null}

            <div className={isFreeFire ? '' : 'sm:col-span-2'}>
              <label
                htmlFor="current-sens-optional"
                className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
              >
                Current Sensitivity (Optional)
              </label>
              <input
                id="current-sens-optional"
                type="text"
                value={input.currentSensitivity ?? ''}
                onChange={(e) => onChangeCurrentSensitivity(e.target.value)}
                placeholder={
                  isFreeFire
                    ? 'e.g. General 185, Red Dot 175'
                    : 'e.g. TPP 120%, Red Dot 55%, Gyro 320%'
                }
                className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm text-white placeholder-[#71717A] outline-none transition-colors"
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
