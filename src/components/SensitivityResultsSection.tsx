import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, Check, Copy, Crosshair, Globe, RefreshCw, Sparkles } from 'lucide-react';
import { formatDeviceFullName } from '../engine/devices';
import type { CalibrationInput, CalibrationResult, SensitivitySliderItem } from '../engine/types';
import { FIELD_LIMITS } from '../backend/validation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RangeSlider, Segmented, TextField } from './giq/primitives';

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
  onPublishPreset: (details: { name: string; playerArchetype: string; description: string }) => Promise<void>;
  onRequestSignIn: () => void;
}

type BgmiCategory = SensitivitySliderItem['category'];

const BGMI_GROUPS: { category: BgmiCategory; title: string; short: string }[] = [
  { category: 'camera', title: 'Camera Sensitivity', short: 'Camera' },
  { category: 'ads', title: 'ADS Sensitivity', short: 'ADS' },
  { category: 'gyro', title: 'Gyroscope Sensitivity', short: 'Gyro' },
  { category: 'ads-gyro', title: 'ADS Gyroscope Sensitivity', short: 'ADS Gyro' },
  { category: 'free-look', title: 'Camera Sensitivity (Free Look)', short: 'Free look' },
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
  const [bgmiGroup, setBgmiGroup] = useState<BgmiCategory>('camera');

  const handleCopyItem = (key: string, text: string) => {
    onCopyText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  const toggleDrawer = (drawer: 'save' | 'publish') => {
    if (!isSignedIn) {
      onRequestSignIn();
      return;
    }
    setActiveDrawer((d) => (d === drawer ? 'none' : drawer));
  };

  const handleSaveSubmit = async (e: FormEvent) => {
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

  const handlePublishSubmit = async (e: FormEvent) => {
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
      <section id="generated-results" aria-live="polite" className="surface scroll-mt-20 space-y-4 rounded-3xl p-5">
        <div className="skeleton h-7 w-48 rounded-lg" />
        <div className="skeleton h-4 w-64 rounded" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="skeleton h-14 rounded-2xl" />
        ))}
      </section>
    );
  }

  if (!hasGenerated) {
    return (
      <section
        id="generated-results"
        aria-label="Sensitivity results preview"
        className="surface relative scroll-mt-20 overflow-hidden rounded-3xl px-6 py-12 text-center"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dots opacity-60" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-hero" />
        <div className="relative mx-auto grid size-20 place-items-center">
          <span className="absolute inset-0 animate-ping-slow rounded-full border-2 border-primary/50" />
          <span className="absolute inset-3 animate-ping-slow rounded-full border border-primary/40 [animation-delay:0.6s]" />
          <span className="relative grid size-14 place-items-center rounded-full border border-primary/50 bg-secondary">
            <Crosshair className="size-6 text-primary" />
          </span>
        </div>
        <h2 className="relative mt-5 font-display text-2xl font-bold tracking-tight">Your profile lands here</h2>
        <p className="relative mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
          Finish the three steps and tap Generate to get tuned values you can copy into the game.
        </p>
      </section>
    );
  }

  const fingers = input.claw.split('-')[0];
  const metaChips = [result.game === 'free-fire' ? 'Free Fire' : 'BGMI', `${input.device.refreshHz}Hz`, `${fingers} fingers`, input.preferredFps.replace(/ \(.*\)/, '')];

  const renderSliderRow = (slider: SensitivitySliderItem, index: number) => {
    const isItemCopied = copiedKey === slider.key;
    return (
      <motion.div
        key={slider.key}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        className="rounded-2xl border border-border bg-secondary/60 p-3.5"
      >
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <label htmlFor={`result-slider-${slider.key}`} className="truncate text-[13px] font-medium text-muted-foreground">
            {slider.label}
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold leading-none tabular-nums">
              {slider.value}
              {slider.unit ? <span className="ml-0.5 text-sm text-primary">{slider.unit}</span> : null}
            </span>
            <button
              type="button"
              onClick={() => handleCopyItem(slider.key, `${slider.label}: ${slider.value}${slider.unit}`)}
              aria-label={`Copy ${slider.label}`}
              className={cn(
                'grid size-8 place-items-center rounded-lg border transition-all active:scale-90',
                isItemCopied
                  ? 'border-success/50 bg-success/10 text-success'
                  : 'border-border bg-background/50 text-subtle hover:text-foreground'
              )}
            >
              {isItemCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>
        <RangeSlider
          id={`result-slider-${slider.key}`}
          min={slider.min}
          max={slider.max}
          value={slider.value}
          onChange={(v) => onSliderChange(slider.key, v)}
        />
      </motion.div>
    );
  };

  const availableGroups = BGMI_GROUPS.filter((g) => result.sliders.some((s) => s.category === g.category));
  const currentGroup = availableGroups.find((g) => g.category === bgmiGroup) ?? availableGroups[0];
  const groupSliders = currentGroup ? result.sliders.filter((s) => s.category === currentGroup.category) : [];

  const actions = [
    {
      key: 'copy',
      label: copiedAll ? 'Copied' : 'Copy all',
      icon: copiedAll ? Check : Copy,
      onClick: onCopyAll,
      primary: true,
      active: false,
    },
    {
      key: 'save',
      label: justSaved ? 'Saved' : isSignedIn ? 'Save' : 'Sign in',
      icon: justSaved ? Check : Bookmark,
      onClick: () => toggleDrawer('save'),
      active: activeDrawer === 'save',
    },
    {
      key: 'publish',
      label: justPublished ? 'Shared' : 'Publish',
      icon: justPublished ? Check : Globe,
      onClick: () => toggleDrawer('publish'),
      active: activeDrawer === 'publish',
    },
    {
      key: 'redo',
      label: hasOverrides ? 'Reset' : 'Redo',
      icon: RefreshCw,
      onClick: onRegenerate,
      active: false,
    },
  ];

  return (
    <section
      id="generated-results"
      aria-labelledby="generated-results-heading"
      className="surface relative scroll-mt-20 overflow-hidden rounded-3xl"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-hero" />

      <div className="relative space-y-4 p-4 sm:p-5">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="size-3.5" /> Profile ready
            </div>
            <span className="truncate rounded-lg border border-border bg-background/60 px-2 py-1 font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
              {result.shareCode}
            </span>
          </div>
          <h2 id="generated-results-heading" className="mt-2 font-display text-3xl font-extrabold leading-none tracking-tight">
            Your sensitivity
          </h2>
          <p className="mt-1.5 truncate text-xs text-muted-foreground">
            {formatDeviceFullName(input.device.brand, input.device.model)}
          </p>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {metaChips.map((c) => (
            <span key={c} className="shrink-0 rounded-full border border-border bg-background/50 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              {c}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-4 gap-2">
          {actions.map(({ key, label, icon: Icon, onClick, primary, active }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className={cn(
                'flex h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border text-[11px] font-semibold transition-all active:scale-95',
                primary
                  ? 'border-transparent bg-gradient-primary text-primary-foreground shadow-glow'
                  : active
                    ? 'border-primary/60 bg-primary/12 text-primary'
                    : 'border-border bg-secondary text-muted-foreground hover:border-border-strong hover:text-foreground'
              )}
            >
              <Icon className="size-[18px]" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {/* Save / Publish drawers */}
        <AnimatePresence initial={false} mode="wait">
          {activeDrawer === 'save' ? (
            <motion.form
              key="save"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onSubmit={(e) => void handleSaveSubmit(e)}
              className="overflow-hidden"
            >
              <div className="space-y-2.5 rounded-2xl border border-border bg-background/50 p-3">
                <label htmlFor="save-profile-name" className="text-xs font-semibold">
                  Name this profile
                </label>
                <TextField
                  id="save-profile-name"
                  maxLength={FIELD_LIMITS.setupNameMaxLength}
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder={`${input.device.model} · ${input.game === 'free-fire' ? 'Free Fire' : 'BGMI'}`}
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="surface" size="md" onClick={() => setActiveDrawer('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="glow" size="md" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save profile'}
                  </Button>
                </div>
              </div>
            </motion.form>
          ) : activeDrawer === 'publish' ? (
            <motion.form
              key="publish"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onSubmit={(e) => void handlePublishSubmit(e)}
              className="overflow-hidden"
            >
              <div className="space-y-2.5 rounded-2xl border border-border bg-background/50 p-3">
                <div className="text-xs font-semibold">Share with the community</div>
                <TextField
                  maxLength={FIELD_LIMITS.presetNameMaxLength}
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Title · e.g. S24 Ultra 4-finger"
                  aria-label="Preset title"
                />
                <TextField
                  maxLength={FIELD_LIMITS.presetArchetypeMaxLength}
                  value={presetArchetype}
                  onChange={(e) => setPresetArchetype(e.target.value)}
                  placeholder="Role · e.g. M416 Assaulter"
                  aria-label="Weapon or role"
                />
                <TextField
                  maxLength={FIELD_LIMITS.presetDescriptionMaxLength}
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="How you tuned it (optional)"
                  aria-label="Description"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="surface" size="md" onClick={() => setActiveDrawer('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="glow" size="md" disabled={submitting}>
                    {submitting ? 'Publishing…' : 'Publish'}
                  </Button>
                </div>
              </div>
            </motion.form>
          ) : null}
        </AnimatePresence>

        {/* Values */}
        {result.game === 'free-fire' ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">{result.sliders.map(renderSliderRow)}</div>
        ) : currentGroup ? (
          <div className="space-y-3">
            <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
              <Segmented
                layoutId="bgmi-group"
                ariaLabel="Sensitivity group"
                size="sm"
                className="min-w-[420px]"
                options={availableGroups.map((g) => ({ id: g.category, label: g.short }))}
                value={currentGroup.category}
                onChange={setBgmiGroup}
              />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h3 className="truncate font-display text-lg font-bold tracking-tight">{currentGroup.title}</h3>
              <button
                type="button"
                onClick={() =>
                  handleCopyItem(
                    currentGroup.category,
                    [`${currentGroup.title} (${input.device.model})`, ...groupSliders.map((s) => `${s.label}: ${s.value}${s.unit}`)].join('\n')
                  )
                }
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors',
                  copiedKey === currentGroup.category
                    ? 'border-success/50 bg-success/10 text-success'
                    : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                {copiedKey === currentGroup.category ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copiedKey === currentGroup.category ? 'Copied' : 'Copy group'}
              </button>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentGroup.category}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1"
              >
                {groupSliders.map(renderSliderRow)}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}

        <p className="border-t border-border pt-3 text-xs leading-relaxed text-subtle">
          Enter these in your in-game sensitivity settings, then test in training and adjust by ±5%.
        </p>
      </div>
    </section>
  );
}
