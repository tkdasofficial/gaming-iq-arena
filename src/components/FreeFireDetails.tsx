import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ChevronDown } from 'lucide-react';
import type { FreeFireAnalysis } from '../engine/freefire/analyze';
import type { SettingRecommendation } from '../engine/freefire/engines';
import type { FeedbackType } from '../engine/freefire/feedback';
import type { SettingKey } from '../engine/freefire/config';
import { submitFeedback } from '../backend/player.functions';
import { useBackend } from '../backend/BackendContext';
import { cn } from '@/lib/utils';
import { Spinner } from './giq/primitives';

const CONFIDENCE_LABEL = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' } as const;
const SOURCE_LABEL: Record<SettingRecommendation['source'], string> = {
  preliminary: 'Starting value',
  feedback: 'From your feedback',
  calibration: 'From your test results',
};
const CALIBRATION_LABEL: Record<SettingRecommendation['calibrationStatus'], string> = {
  not_calibrated: 'Not calibrated yet',
  insufficient_data: 'Not enough test results yet',
  stale: 'Test results out of date',
  calibrated: 'Calibrated',
};
const FEEDBACK: { id: FeedbackType; label: string }[] = [
  { id: 'too_fast', label: 'Too fast' },
  { id: 'too_slow', label: 'Too slow' },
  { id: 'overshooting', label: 'Overshooting' },
  { id: 'undershooting', label: 'Undershooting' },
  { id: 'unstable', label: 'Shaky' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'accurate', label: 'Accurate' },
];

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Per-setting range, confidence, calibration status and feedback for the Free Fire hybrid engine. */
export function FreeFireDetails({ analysis, descriptions = {} }: { analysis: FreeFireAnalysis; descriptions?: Record<string, string> }) {
  const { user } = useBackend();
  const send = useServerFn(submitFeedback);
  const [state, setState] = useState<Partial<Record<SettingKey, { busy?: boolean; next?: number; error?: string; sent?: FeedbackType }>>>({});
  const ids = analysis.recommendationIds ?? {};
  const canFeedback = Boolean(user) && Object.keys(ids).length > 0;

  const onFeedback = async (key: SettingKey, type: FeedbackType) => {
    const id = ids[key];
    if (!id) return;
    setState((s) => ({ ...s, [key]: { ...s[key], busy: true, error: undefined } }));
    try {
      const res = await send({ data: { recommendationId: id, feedbackType: type } });
      setState((s) => ({ ...s, [key]: res.ok ? { next: res.newValue, sent: type } : { error: res.error } }));
    } catch {
      setState((s) => ({ ...s, [key]: { error: 'Could not send feedback. Please try again.' } }));
    }
  };

  return (
    <>
      <section className="surface rounded-xl p-4 sm:p-5" aria-label="Range and confidence">
        <h3 className="text-sm font-semibold">Range and confidence</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Start at the value shown and stay inside the range while you fine-tune.
          {canFeedback ? ' After a match, tell us how each one felt — only that setting changes.' : ''}
        </p>
        <ul className="mt-2 divide-y divide-border">
          {analysis.settings.map((s) => {
            const st = state[s.key] ?? {};
            return (
              <li key={s.key} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium">{s.label}</div>
                    {descriptions[s.label] ? <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{descriptions[s.label]}</p> : null}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Chip strong={s.confidence === 'high'}>{CONFIDENCE_LABEL[s.confidence]}</Chip>
                      <Chip>{SOURCE_LABEL[s.source]}</Chip>
                      {s.source !== 'calibration' ? <Chip>{CALIBRATION_LABEL[s.calibrationStatus]}</Chip> : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm font-medium tabular-nums">{s.suggested}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {s.min}–{s.max}
                    </div>
                  </div>
                </div>
                {s.notUsed ? <p className="mt-1.5 text-[11px] text-muted-foreground">You said you don’t use Free Look, so you can leave this as it is.</p> : null}
                {canFeedback && ids[s.key] ? (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`How did ${s.label} feel?`}>
                      {FEEDBACK.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          disabled={st.busy}
                          onClick={() => void onFeedback(s.key, f.id)}
                          className={cn(
                            'h-7 shrink-0 rounded-full border px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                            st.sent === f.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div aria-live="polite" className="min-h-0">
                      {st.busy ? <Spinner className="mt-1.5 size-3.5 text-muted-foreground" /> : null}
                      {st.next !== undefined ? (
                        <p className="mt-1.5 text-[11px] text-foreground">
                          {st.sent === 'comfortable' || st.sent === 'accurate' ? `Noted — keep ${s.label} at ${st.next}.` : `Try ${s.label} at ${st.next} in your next match.`}
                        </p>
                      ) : null}
                      {st.error ? <p className="mt-1.5 text-[11px] text-destructive">{st.error}</p> : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {!user ? <p className="mt-1 text-[11px] text-muted-foreground">Sign in to answer play-style questions and send feedback on each setting.</p> : null}
      </section>

      <details className="group surface rounded-xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-semibold">How this was calculated</span>
            <span className="block text-[11px] text-muted-foreground">Phone scores, missing data and calculator version</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
            <IndexBox title="Performance" index={analysis.pi} />
            <IndexBox title="Touch & display" index={analysis.tdi} />
          </div>
          {analysis.notes.length ? (
            <ul className="space-y-1.5">
              {analysis.notes.map((n) => (
                <li key={n} className="text-[12px] leading-relaxed text-muted-foreground">• {n}</li>
              ))}
            </ul>
          ) : null}
          <div>
            <div className="text-[12px] font-medium">What moved each value</div>
            <ul className="mt-1 divide-y divide-border">
              {analysis.settings.map((s) => (
                <li key={s.key} className="py-2 text-[12px]">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground tabular-nums">starting value {s.base} · data {pct(s.dataCompleteness)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {s.factors.length
                      ? s.factors.map((f) => `${f.label} ${f.effect > 0 ? '+' : ''}${(f.effect * 100).toFixed(1)}%`).join(' · ')
                      : 'Nothing adjusted it yet.'}
                    {s.missingInputs.length ? ` Missing: ${s.missingInputs.join(', ')}.` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] text-subtle">Calculator version {analysis.modelVersionId}</p>
        </div>
      </details>
    </>
  );
}

function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span className={cn('rounded-full border px-2 py-0.5 text-[10.5px] leading-none', strong ? 'border-primary text-foreground' : 'border-border text-muted-foreground')}>
      {children}
    </span>
  );
}

function IndexBox({ title, index }: { title: string; index: FreeFireAnalysis['pi'] }) {
  return (
    <div className="bg-card p-3">
      <div className="text-[11px] font-medium text-muted-foreground">{title}</div>
      <div className="mt-1 font-mono text-xl font-medium tabular-nums">
        {index.score === null ? <span className="text-sm text-muted-foreground">Not measured</span> : <>{index.score}<span className="ml-0.5 text-xs text-muted-foreground">/10</span></>}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">Data available: {pct(index.completeness)}</div>
    </div>
  );
}
