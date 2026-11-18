import { useState } from 'react';
import { Bookmark, BookmarkCheck, Check, Copy, ExternalLink, Info, LogIn } from 'lucide-react';
import { formatRecommendationText, type Recommendation } from '../engine/recommend';
import { Button } from '@/components/ui/button';
import { DeviceSpecs } from './DeviceSpecs';
import { Eyebrow, Notice, Segmented, Spinner } from './giq/primitives';

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
  const [groupId, setGroupId] = useState(rec.groups[0]?.id ?? '');
  const group = rec.groups.find((g) => g.id === groupId) ?? rec.groups[0];
  const unit = rec.unit;

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
            <p className="mt-0.5 text-xs text-muted-foreground">
              Recommended starting values · scale 0–{rec.scaleMax === 400 ? '300/400' : rec.scaleMax}
              {unit}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button onClick={() => void copyAll()} size="md" className="flex-1 sm:flex-none" aria-live="polite">
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied' : 'Copy all settings'}
            </Button>
            {saveState !== 'hidden' ? (
              <Button
                variant="outline"
                size="md"
                className="flex-1 sm:flex-none"
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
            <div key={c.id} className="min-w-0 bg-card p-3">
              <div className="text-xs font-medium text-muted-foreground">{c.label}</div>
              <div className="mt-1 font-mono text-[28px] font-medium leading-none tracking-tight tabular-nums">
                {c.value}
                {unit ? <span className="ml-0.5 text-sm text-muted-foreground">{unit}</span> : null}
              </div>
              <div className="mt-1.5 truncate text-[11px] text-subtle" title={c.source}>
                {c.source}
              </div>
            </div>
          ))}
        </div>
        {GYRO_NOTE[rec.gyro] ? (
          <Notice icon={Info} className="mt-3">
            {GYRO_NOTE[rec.gyro]}
          </Notice>
        ) : null}
      </div>

      {/* Full settings per group (BGMI / PUBG Mobile) */}
      {multiGroup && group ? (
        <section className="surface rounded-xl p-4 sm:p-5" aria-label="All settings">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">All in-game settings</h3>
            <Segmented
              ariaLabel="Settings group"
              className="w-full sm:w-auto"
              value={group.id}
              onChange={setGroupId}
              options={rec.groups.map((g) => ({ id: g.id, label: g.label }))}
            />
          </div>
          <ul className="mt-3 divide-y divide-border">
            {group.settings.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-[13px] text-muted-foreground">{s.label}</span>
                <span className="font-mono text-sm font-medium tabular-nums">
                  {s.value}
                  {unit}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Game-specific extras */}
      {rec.extras.length ? (
        <section className="surface rounded-xl p-4 sm:p-5" aria-label="Additional settings">
          <h3 className="text-sm font-semibold">Additional {rec.gameShortName} settings</h3>
          <ul className="mt-2 divide-y divide-border">
            {rec.extras.map((e) => (
              <li key={e.label} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{e.label}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{e.note}</div>
                </div>
                <span className="font-mono text-sm font-medium">{e.value}</span>
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
        in a training match.
      </p>
    </article>
  );
}
