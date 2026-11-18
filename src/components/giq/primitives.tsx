import type { ComponentType, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconType = ComponentType<{ className?: string }>;

/** Gaming IQ logo mark + wordmark. */
export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <path d="M12 2v5M12 17v5M2 12h5M17 12h5" strokeLinecap="round" />
        </svg>
      </span>
      {!compact ? <span className="text-[15px] font-semibold tracking-tight">Gaming IQ</span> : null}
    </span>
  );
}

/** Small label above a section or control. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground', className)}>{children}</p>
  );
}

/** Page title block. */
export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/** Numbered step label used in the generator form. */
export function StepLabel({ step, children, htmlFor, aside }: { step: number; children: ReactNode; htmlFor?: string; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-[13px] font-medium text-foreground">
        <span className="grid size-5 place-items-center rounded-full border border-border-strong font-mono text-[10px] text-muted-foreground">
          {step}
        </span>
        {children}
      </label>
      {aside}
    </div>
  );
}

/** Centered empty / sign-in state. */
export function EmptyState({ icon: Icon, title, body, actions, className }: { icon: IconType; title: string; body: string; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('surface rounded-xl px-6 py-12 text-center', className)}>
      <span className="mx-auto grid size-11 place-items-center rounded-lg border border-border bg-secondary">
        <Icon className="size-5 text-muted-foreground" />
      </span>
      <h2 className="mt-4 text-base font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {actions ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Inline notice banner. */
export function Notice({ tone = 'neutral', icon: Icon, children, action, className }: { tone?: 'neutral' | 'danger'; icon?: IconType; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px]',
        tone === 'danger' ? 'border-destructive/40 bg-destructive/5 text-foreground' : 'border-border bg-secondary text-muted-foreground',
        className
      )}
    >
      {Icon ? <Icon className={cn('mt-0.5 size-4 shrink-0', tone === 'danger' ? 'text-destructive' : 'text-muted-foreground')} /> : null}
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Two-to-four option segmented control. */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel, className }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; ariaLabel?: string; className?: string }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('no-scrollbar flex overflow-x-auto rounded-lg border border-border bg-secondary p-0.5', className)}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'h-8 flex-1 shrink-0 whitespace-nowrap rounded-md px-1.5 text-[12px] sm:px-3 sm:text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-card text-foreground ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden="true" />;
}
