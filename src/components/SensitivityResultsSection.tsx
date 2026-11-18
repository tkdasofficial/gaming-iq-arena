import { useState } from 'react';
import { Bookmark, Check, Copy, Crosshair, Globe, RefreshCw } from 'lucide-react';
import { formatDeviceFullName } from '../engine/devices';
import type {
  CalibrationInput,
  CalibrationResult,
  SensitivitySliderItem,
} from '../engine/types';
import { BLUEPRINT_LIMITS } from '../firebase/validation';

interface SensitivityResultsSectionProps {
  input: CalibrationInput;
  result: CalibrationResult;
  hasGenerated: boolean;
  isGenerating: boolean;
  hasOverrides: boolean;
  copiedAll: boolean;
  isSignedIn: boolean;
  onSliderChange: (key: string, value: number) => void;
  onCopyAll: () => void;
  onCopyText: (text: string) => void;
  onRegenerate: () => void;
  onSaveProfile: (name: string) => Promise<void>;
  onPublishPreset: (details: {
    name: string;
    playerArchetype: string;
    description: string;
  }) => Promise<void>;
  onRequestSignIn: () => void;
}

const BGMI_GROUPS: {
  category: SensitivitySliderItem['category'];
  title: string;
}[] = [
  { category: 'camera', title: 'Camera Sensitivity' },
  { category: 'ads', title: 'ADS Sensitivity' },
  { category: 'gyro', title: 'Gyroscope Sensitivity' },
  { category: 'ads-gyro', title: 'ADS Gyroscope Sensitivity' },
  { category: 'free-look', title: 'Camera Sensitivity (Free Look)' },
];

export function SensitivityResultsSection({
  input,
  result,
  hasGenerated,
  isGenerating,
  hasOverrides,
  copiedAll,
  isSignedIn,
  onSliderChange,
  onCopyAll,
  onCopyText,
  onRegenerate,
  onSaveProfile,
  onPublishPreset,
  onRequestSignIn,
}: SensitivityResultsSectionProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'save' | 'publish'>('none');
  const [profileName, setProfileName] = useState('');
  const [presetArchetype, setPresetArchetype] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  const handleCopyItem = (key: string, text: string) => {
    onCopyText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      onRequestSignIn();
      return;
    }
    const fallbackName = `${formatDeviceFullName(input.device.brand, input.device.model)} · ${
      input.game === 'free-fire' ? 'Free Fire' : 'BGMI'
    }`;
    setSubmitting(true);
    try {
      await onSaveProfile(profileName.trim() || fallbackName);
      setProfileName('');
      setActiveDrawer('none');
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      onRequestSignIn();
      return;
    }
    const fallbackName = `${input.device.model} ${input.playstyle.replace('-', ' ')}`;
    setSubmitting(true);
    try {
      await onPublishPreset({
        name: profileName.trim() || fallbackName,
        playerArchetype: presetArchetype.trim() || `${input.claw} · ${input.device.refreshHz}Hz`,
        description:
          presetDescription.trim() ||
          `Calibrated for ${formatDeviceFullName(input.device.brand, input.device.model)} (${input.preferredFps}).`,
      });
      setProfileName('');
      setPresetArchetype('');
      setPresetDescription('');
      setActiveDrawer('none');
      setJustPublished(true);
      window.setTimeout(() => setJustPublished(false), 2200);
    } finally {
      setSubmitting(false);
    }
  };

  if (isGenerating) {
    return (
      <section
        id="generated-results"
        aria-live="polite"
        className="bg-[#141417] border border-[#29292F] rounded-xl p-6 space-y-4"
      >
        <div className="h-6 w-56 rounded bg-[#1B1B20] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-24 rounded-lg bg-[#1B1B20] border border-[#29292F] animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!hasGenerated) {
    return (
      <section
        id="generated-results"
        aria-label="Sensitivity results preview"
        className="bg-[#141417] border border-[#29292F] rounded-xl p-8 text-center space-y-2"
      >
        <div className="w-10 h-10 rounded-xl bg-[#1B1B20] border border-[#29292F] flex items-center justify-center mx-auto">
          <Crosshair className="w-5 h-5 text-[#71717A]" />
        </div>
        <h2 className="font-display text-xl font-bold text-white">
          No Sensitivity Profile Generated Yet
        </h2>
        <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
          Select your game, confirm device specs, and choose your gameplay preferences above to build your configuration.
        </p>
      </section>
    );
  }

  const deviceSummary = `${result.gameLabel} · ${formatDeviceFullName(input.device.brand, input.device.model)} · ${input.device.refreshHz}Hz · ${input.claw.replace('-', ' ')}`;

  const renderSliderCard = (slider: SensitivitySliderItem) => {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    const isItemCopied = copiedKey === slider.key;
    return (
      <div
        key={slider.key}
        className="p-3.5 rounded-lg bg-[#1B1B20] border border-[#29292F] space-y-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <label
            htmlFor={`result-slider-${slider.key}`}
            className="text-xs font-medium text-[#A1A1AA] leading-snug"
          >
            {slider.label}
          </label>
          <button
            type="button"
            onClick={() =>
              handleCopyItem(slider.key, `${slider.label}: ${slider.value}${slider.unit}`)
            }
            aria-label={`Copy ${slider.label}`}
            className="min-h-[28px] min-w-[28px] px-1.5 rounded bg-[#111114] border border-[#29292F] hover:border-[#F0263C] text-[#A1A1AA] hover:text-white inline-flex items-center justify-center transition-colors shrink-0"
          >
            {isItemCopied ? (
              <Check className="w-3.5 h-3.5 text-[#F0263C]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <div className="font-mono text-3xl font-bold text-white tabular-nums leading-none">
          {slider.value}
          {slider.unit ? (
            <span className="text-sm font-semibold text-[#F0263C] ml-0.5">
              {slider.unit}
            </span>
          ) : null}
        </div>

        <input
          id={`result-slider-${slider.key}`}
          type="range"
          min={slider.min}
          max={slider.max}
          value={slider.value}
          onChange={(e) => onSliderChange(slider.key, Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, #F0263C 0%, #F0263C ${pct}%, #29292F ${pct}%, #29292F 100%)`,
          }}
          className="giq-slider"
        />
      </div>
    );
  };

  return (
    <section
      id="generated-results"
      aria-labelledby="generated-results-heading"
      className="bg-[#141417] border border-[#29292F] rounded-xl p-4 sm:p-6 space-y-5"
    >
      {/* Results Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#29292F]">
        <div className="min-w-0">
          <h2
            id="generated-results-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight"
          >
            Generated Sensitivity Profile
          </h2>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5 truncate">
            {deviceSummary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCopyAll}
            className="min-h-[40px] px-4 rounded-lg bg-[#F0263C] hover:bg-[#B8172A] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAll ? 'Copied All' : 'Copy All'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isSignedIn) {
                onRequestSignIn();
                return;
              }
              setActiveDrawer((d) => (d === 'save' ? 'none' : 'save'));
            }}
            className="min-h-[40px] px-3.5 rounded-lg bg-white hover:bg-[#E4E4E7] text-black text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            {justSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#F0263C]" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>{isSignedIn ? 'Save to Cloud' : 'Sign In to Save'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isSignedIn) {
                onRequestSignIn();
                return;
              }
              setActiveDrawer((d) => (d === 'publish' ? 'none' : 'publish'));
            }}
            className="min-h-[40px] px-3.5 rounded-lg bg-[#1B1B20] hover:bg-[#29292F] border border-[#29292F] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            {justPublished ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#F0263C]" />
                <span>Published</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 text-[#F0263C]" />
                <span>Publish Preset</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRegenerate}
            className="min-h-[40px] px-3.5 rounded-lg bg-[#1B1B20] hover:bg-[#29292F] border border-[#29292F] text-[#A1A1AA] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{hasOverrides ? 'Reset & Regenerate' : 'Regenerate'}</span>
          </button>
        </div>
      </div>

      {/* Inline Save Form */}
      {activeDrawer === 'save' ? (
        <form
          onSubmit={(e) => void handleSaveSubmit(e)}
          className="p-3 rounded-lg bg-[#111114] border border-[#29292F] flex flex-col sm:flex-row gap-2.5"
        >
          <label htmlFor="save-profile-name" className="sr-only">
            Profile Name
          </label>
          <input
            id="save-profile-name"
            type="text"
            maxLength={BLUEPRINT_LIMITS.setupNameMaxLength}
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder={`${input.device.model} · ${
              input.game === 'free-fire' ? 'Free Fire' : 'BGMI'
            }`}
            className="flex-1 min-h-[44px] px-3 rounded-lg bg-[#1B1B20] border border-[#29292F] focus:border-[#F0263C] text-sm text-white placeholder-[#71717A] outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-lg bg-[#F0263C] hover:bg-[#B8172A] disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap"
            >
              {submitting ? 'Saving...' : 'Confirm Save'}
            </button>
            <button
              type="button"
              onClick={() => setActiveDrawer('none')}
              className="min-h-[44px] px-3 rounded-lg bg-[#1B1B20] border border-[#29292F] text-[#A1A1AA] hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {/* Inline Publish Public Preset Form */}
      {activeDrawer === 'publish' ? (
        <form
          onSubmit={(e) => void handlePublishSubmit(e)}
          className="p-4 rounded-lg bg-[#111114] border border-[#29292F] space-y-3"
        >
          <div className="text-xs font-semibold text-white">
            Publish Public Community Preset
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              maxLength={BLUEPRINT_LIMITS.presetNameMaxLength}
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Preset title (e.g. S24 Ultra 4-Finger Balanced)"
              className="min-h-[44px] px-3 rounded-lg bg-[#1B1B20] border border-[#29292F] focus:border-[#F0263C] text-sm text-white placeholder-[#71717A] outline-none"
            />
            <input
              type="text"
              maxLength={BLUEPRINT_LIMITS.presetArchetypeMaxLength}
              value={presetArchetype}
              onChange={(e) => setPresetArchetype(e.target.value)}
              placeholder="Weapon / Role (e.g. M416 · Assaulter)"
              className="min-h-[44px] px-3 rounded-lg bg-[#1B1B20] border border-[#29292F] focus:border-[#F0263C] text-sm text-white placeholder-[#71717A] outline-none"
            />
          </div>
          <input
            type="text"
            maxLength={BLUEPRINT_LIMITS.presetDescriptionMaxLength}
            value={presetDescription}
            onChange={(e) => setPresetDescription(e.target.value)}
            placeholder="Brief note on how you tuned this setup..."
            className="w-full min-h-[44px] px-3 rounded-lg bg-[#1B1B20] border border-[#29292F] focus:border-[#F0263C] text-sm text-white placeholder-[#71717A] outline-none"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setActiveDrawer('none')}
              className="min-h-[40px] px-3 rounded-lg bg-[#1B1B20] border border-[#29292F] text-[#A1A1AA] hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[40px] px-4 rounded-lg bg-[#F0263C] hover:bg-[#B8172A] disabled:opacity-60 text-white text-xs font-semibold"
            >
              {submitting ? 'Publishing...' : 'Publish to Firestore'}
            </button>
          </div>
        </form>
      ) : null}

      {/* Game-Specific Output Layout */}
      {result.game === 'free-fire' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {result.sliders.map(renderSliderCard)}
        </div>
      ) : (
        <div className="space-y-4">
          {BGMI_GROUPS.map((group) => {
            const groupSliders = result.sliders.filter(
              (s) => s.category === group.category
            );
            if (groupSliders.length === 0) return null;
            const groupCopyText = [
              `${group.title} (${input.device.model})`,
              ...groupSliders.map((s) => `${s.label}: ${s.value}${s.unit}`),
            ].join('\n');
            const isGroupCopied = copiedKey === group.category;

            return (
              <div
                key={group.category}
                className="p-4 rounded-xl bg-[#111114] border border-[#29292F] space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-bold text-white tracking-tight">
                    {group.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCopyItem(group.category, groupCopyText)}
                    className="min-h-[32px] px-2.5 rounded-lg bg-[#1B1B20] border border-[#29292F] hover:border-[#F0263C] text-xs font-semibold text-[#A1A1AA] hover:text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    {isGroupCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#F0263C]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Group</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {groupSliders.map(renderSliderCard)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hardware Summary + Neutral Application Note */}
      <div className="pt-3 border-t border-[#29292F] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#A1A1AA]">
        <div>
          Apply these baseline values in your in-game Sensitivity settings and test in Training Grounds to adjust by ±5%.
        </div>
        <div className="font-mono text-white shrink-0 tabular-nums">
          {result.shareCode}
        </div>
      </div>
    </section>
  );
}
