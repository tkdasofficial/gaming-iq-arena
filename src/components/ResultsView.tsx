import { useState } from 'react';
import { AlertTriangle, Bookmark, BookmarkCheck, Check, ChevronDown, Copy, ExternalLink, Info, LogIn } from 'lucide-react';
import { formatRecommendationText, type Recommendation } from '../engine/recommend';
import { DEVICE_AGE_LABELS, type DeviceAge } from '../backend/rotation.core';
import { Button } from '@/components/ui/button';
import { DeviceSpecs } from './DeviceSpecs';
import { FreeFireDetails } from './FreeFireDetails';
import { Eyebrow, Notice, Spinner } from './giq/primitives';

const GYRO_NOTE: Partial<Record<Recommendation['gyro'], string>> = {
  'not-verified': 'Gyroscope settings are hidden because this phone’s gyroscope isn’t verified.',
  'software-only': 'Gyroscope settings are hidden because this phone only lists a software gyroscope.',
  'not-supported': 'Gyroscope settings are hidden because this phone has no gyroscope.',
};

interface ResultsViewProps {
  rec: Recommendation;
  /** Save button state: 'hidden' omits the button entirely. */
  saveState?: 'idle' | 'saving' | 'saved' | 'signed-out' | 'hidden';
  onSave?: () => void;
  saveError?: string | null;
}

export function ResultsView({ rec, saveState = 'hidden', onSave, saveError }: ResultsViewProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const multiGroup = rec.groups.length > 1;
  const unit = rec.unit;
  const rangeFor = (coreId: string) => {
    const s = rec.analysis?.settings.find((x) => x.key === coreId);
    return s ? `${s.min}–${s.max}` : null;
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(formatRecommendationText(rec));
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <article aria-label="Recommended settings" className="space-y-4">
      {/* Header */}
      <div className="surface rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow>{rec.gameName}</Eyebrow>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight">{rec.device.fullName}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Recommended starting values</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button onClick={() => void copyAll()} size="md" className="min-w-0 px-2 sm:px-4" aria-live="polite">
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied' : 'Copy all'}
            </Button>
            {saveState !== 'hidden' ? (
              <Button
                variant="outline"
                size="md"
                className="min-w-0 px-2 sm:px-4"
                onClick={onSave}
                disabled={saveState === 'saving' || saveState === 'saved'}
              >
                {saveState === 'saving' ? <Spinner /> : saveState === 'saved' ? <BookmarkCheck /> : saveState === 'signed-out' ? <LogIn /> : <Bookmark />}
                {saveState === 'saved' ? 'Saved' : saveState === 'signed-out' ? 'Sign in to save' : 'Save'}
              </Button>
            ) : null}
          </div>
        </div>
        {copyFailed ? <p className="mt-3 text-xs text-destructive">Copy isn’t available in this browser. Long-press the values to copy them.</p> : null}
        {saveError ? <p className="mt-3 text-xs text-destructive">{saveError}</p> : null}

        {/* Core values */}
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          {rec.core.map((c) => (
            <div key={c.id} className="flex min-w-0 flex-col bg-card p-3">
              <div className="text-xs font-medium leading-snug text-muted-foreground">{c.label}</div>
              <div className="flex-1" />
              <div className="mt-1 font-mono text-[28px] font-medium leading-none tracking-tight tabular-nums">
                {c.value}
                {unit ? <span className="ml-0.5 text-sm text-muted-foreground">{unit}</span> : null}
              </div>
              {rangeFor(c.id) ? <div className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">Range {rangeFor(c.id)}</div> : null}
              {c.source ? (
                <div className="mt-1.5 truncate text-[11px] text-subtle" title={c.source}>
                  {c.source}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {GYRO_NOTE[rec.gyro] ? (
          <Notice icon={Info} className="mt-3">
            {GYRO_NOTE[rec.gyro]}
          </Notice>
        ) : null}
      </div>

      {rec.rotation ? <RotationCard rotation={rec.rotation} unit={unit} /> : null}

      {rec.analysis ? <FreeFireDetails analysis={rec.analysis} descriptions={Object.fromEntries(rec.groups.flatMap((g) => g.settings).map((x) => [x.label, x.description ?? '']))} /> : null}

      {/* Every in-game slider, laid out the way this game structures them */}
      {rec.groups.length && !rec.analysis ? (
        <section className="surface rounded-xl p-4 sm:p-5" aria-label="All settings">
          <h3 className="text-sm font-semibold">All {rec.gameShortName} settings</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {multiGroup ? 'Grouped like the game’s Sensitivity screen — tap a section to open it' : 'Same names as the game’s Sensitivity screen'}
          </p>
          {multiGroup ? (
            <div className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {rec.groups.map((g, i) => (
                <details key={g.id} open={i === 0} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-secondary/60 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold">{g.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{g.settings.length} settings</span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="px-3 pb-1">
                    {g.description ? (
                      <p className="rounded-lg bg-secondary px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">{g.description}</p>
                    ) : null}
                    <SettingList settings={g.settings} unit={unit} />
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <>
              {rec.groups[0].description ? (
                <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">{rec.groups[0].description}</p>
              ) : null}
              <SettingList settings={rec.groups[0].settings} unit={unit} />
            </>
          )}
        </section>
      ) : null}

      {/* Game-specific extras */}
      {rec.extras.length ? (
        <section className="surface rounded-xl p-4 sm:p-5" aria-label="Additional settings">
          <h3 className="text-sm font-semibold">Additional {rec.gameShortName} settings</h3>
          <ul className="mt-2 divide-y divide-border">
            {rec.extras.map((e) => (
              <li key={e.label} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{e.label}</div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{e.note}</p>
                </div>
                <span className="shrink-0 pt-0.5 text-right font-mono text-sm font-medium">{e.value}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Verified hardware — kept visually separate from recommendations */}
      <section className="rounded-xl border border-dashed border-border-strong p-4 sm:p-5" aria-label="Verified hardware">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Verified hardware used</h3>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {rec.device.verification === 'verified' ? 'From catalog · verified' : 'Partially verified'}
          </span>
        </div>
        <DeviceSpecs device={rec.device} full className="mt-3" />
        {rec.device.sources[0] ? (
          <a
            href={rec.device.sources[0].url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Specification source <ExternalLink className="size-3" />
          </a>
        ) : null}
      </section>

      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        Calculated from {rec.basis.join(', ')}. These are starting points, not guaranteed perfect values — fine-tune them
        in a training match.{rec.analysis ? ' Accuracy has not been measured yet; it will be tracked as players send feedback.' : ''}
      </p>
    </article>
  );
}

/** General Sensitivity calculated from the player's rotation test. */
function RotationCard({ rotation, unit }: { rotation: NonNullable<Recommendation['rotation']>; unit: string }) {
  const ageLabel = rotation.deviceAge ? (DEVICE_AGE_LABELS[rotation.deviceAge as DeviceAge] ?? rotation.deviceAge) : null;
  const facts: { label: string; value: string }[] = [
    { label: 'Target rotation', value: String(rotation.targetRotation) },
    { label: 'Your rotations at General 0', value: String(rotation.zeroRotation) },
    { label: `Predicted at ${rotation.recommended}`, value: `≈ ${rotation.predictedRotation}` },
    { label: 'Predicted at 200 (max)', value: `≈ ${rotation.maxPredictedRotation}` },
  ];
  if (ageLabel) facts.push({ label: 'Phone age', value: ageLabel });
  return (
    <section className="surface rounded-xl p-4 sm:p-5" aria-label="Rotation test result">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>From your rotation test</Eyebrow>
          <h3 className="mt-1 text-sm font-semibold">General Sensitivity</h3>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[32px] font-medium leading-none tracking-tight tabular-nums">
            {rotation.recommended}
            {unit ? <span className="ml-0.5 text-sm text-muted-foreground">{unit}</span> : null}
          </div>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="bg-card p-2.5">
            <dt className="text-[11px] text-muted-foreground">{f.label}</dt>
            <dd className="mt-0.5 font-mono text-[13px] font-medium tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>
      {rotation.status === 'unreachable' ? (
        <Notice tone="danger" icon={AlertTriangle} className="mt-3">
          This phone reaches about {rotation.maxPredictedRotation} rotations even at General {rotation.recommended}, below the target of{' '}
          {rotation.targetRotation}. Use {rotation.recommended} — the maximum the game allows.
        </Notice>
      ) : rotation.status === 'already-at-target' ? (
        <Notice icon={Info} className="mt-3">
          Your phone already makes {rotation.zeroRotation} rotations at General 0, at or above the target of {rotation.targetRotation} — keep General
          at {rotation.recommended}.
        </Notice>
      ) : null}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {rotation.model === 'measured-curve'
          ? 'Calculated from verified rotation measurements for this phone.'
          : 'Calculated with the starting model (General 0 = 1×, 100 = 2×, 200 = 3× rotation). This is a working assumption, not a verified Free Fire mechanic — fine-tune in a training match.'}
      </p>
    </section>
  );
}

function SettingList({ settings, unit }: { settings: Recommendation['groups'][number]['settings']; unit: string }) {
  return (
    <ul className="mt-2 divide-y divide-border">
      {settings.map((s) => (
        <li key={s.key} className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-foreground">{s.label}</div>
            {s.description ? <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{s.description}</p> : null}
          </div>
          {s.value === null ? (
            <span className="shrink-0 pt-0.5 text-right text-[11px] text-muted-foreground">No starting value yet</span>
          ) : (
            <span className="shrink-0 pt-0.5 font-mono text-sm font-medium tabular-nums">
              {s.value}
              {unit}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
