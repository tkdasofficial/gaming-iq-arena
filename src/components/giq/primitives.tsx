import { useState, type ComponentType, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconType = ComponentType<{ className?: string }>;

/** Gaming IQ logo mark + wordmark. */
export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative grid size-8 shrink-0 place-items-center rounded-[10px] bg-gradient-primary shadow-glow">
        <Crosshair className="size-[18px] text-primary-foreground" strokeWidth={2.5} />
      </span>
      {!compact ? (
        <span className="font-display text-[22px] font-extrabold leading-none tracking-tight">
          Gaming <span className="text-gradient-primary">IQ</span>
        </span>
      ) : null}
    </span>
  );
}

/** Page title block shared by every tab. */
export function PageHeader({
  kicker,
  title,
  subtitle,
  action,
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="min-w-0">
        {kicker ? (
          <div className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="size-1.5 rounded-full bg-primary shadow-glow" />
            {kicker}
          </div>
        ) : null}
        <h1 className="font-display text-[34px] font-extrabold leading-[0.95] tracking-tight sm:text-5xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-xl text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/** Raised card with a numbered or icon header. */
export function Panel({
  step,
  icon: Icon,
  title,
  meta,
  action,
  children,
  className,
  id,
}: {
  step?: string;
  icon?: IconType;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('surface rounded-3xl p-4 sm:p-5', className)}>
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-secondary font-mono text-xs font-bold text-primary">
            {Icon ? <Icon className="size-4" /> : step}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold leading-none tracking-tight sm:text-[22px]">{title}</h2>
            {meta ? <div className="mt-1 truncate text-xs text-muted-foreground">{meta}</div> : null}
          </div>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-1.5">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Small uppercase label above a control. */
export function FieldLabel({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
}) {
  const Comp = htmlFor ? 'label' : 'span';
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <Comp htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {children}
      </Comp>
      {hint ? <span className="font-mono text-xs font-semibold tabular-nums text-foreground">{hint}</span> : null}
    </div>
  );
}

const fieldBase =
  'w-full h-12 rounded-xl border border-border bg-secondary px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-subtle hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-primary/15';

export function TextField({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} className={cn(fieldBase, invalid && 'border-primary', className)} />;
}

export function SelectField({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cn(fieldBase, 'appearance-none pr-10', className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs font-medium text-primary">{children}</p>;
}

/** Segmented control with a sliding active pill. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  size = 'md',
  className,
  ariaLabel,
}: {
  options: { id: T; label: ReactNode; icon?: IconType }[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('grid gap-1 rounded-2xl border border-border bg-background/60 p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              'relative inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              size === 'sm' ? 'h-9 text-xs' : 'h-11 text-[13px]',
              active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-gradient-primary shadow-glow"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            ) : null}
            <span className="relative z-10 inline-flex min-w-0 items-center gap-1.5">
              {Icon ? <Icon className="size-4 shrink-0" /> : null}
              <span className="truncate">{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Selectable tile, used for grids of options. */
export function OptionTile({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'relative flex h-12 min-w-0 items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[13px] font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary/70 bg-primary/12 text-foreground shadow-glow'
          : 'border-border bg-secondary text-muted-foreground hover:border-border-strong hover:text-foreground',
        className
      )}
    >
      <span className="truncate">{children}</span>
      <span
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full border transition-all',
          active ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong text-transparent'
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    </button>
  );
}

/** Small pill chip for compact choices (RAM, storage...). */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-9 shrink-0 rounded-full border px-3.5 font-mono text-xs font-semibold tabular-nums transition-all active:scale-95',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-glow'
          : 'border-border bg-secondary text-muted-foreground hover:border-border-strong hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

/** Tokenised range input. */
export function RangeSlider({
  value,
  min,
  max,
  step,
  onChange,
  id,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  id?: string;
  ariaLabel?: string;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ['--pct' as string]: `${pct}%` }}
      className="giq-slider"
    />
  );
}

/** Square icon button with optional text on wider screens. */
export function IconAction({
  icon: Icon,
  label,
  onClick,
  active,
  showLabel = false,
  disabled,
}: {
  icon: IconType;
  label: string;
  onClick: () => void;
  active?: boolean;
  showLabel?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary/60 bg-primary/12 text-primary'
          : 'border-border bg-secondary text-muted-foreground hover:border-border-strong hover:text-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" />
      {showLabel ? <span className="hidden sm:inline">{label}</span> : null}
    </button>
  );
}

/** Collapsible row with animated height. */
export function Disclosure({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: IconType;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-background/40">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between gap-3 px-4 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          {Icon ? <Icon className="size-4 shrink-0 text-primary" /> : null}
          <span className="truncate">{title}</span>
        </span>
        <ChevronDown className={cn('size-4 shrink-0 transition-transform duration-300', open && 'rotate-180 text-primary')} />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Centered empty / sign-in state. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  actions,
}: {
  icon: IconType;
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <div className="surface relative overflow-hidden rounded-3xl px-6 py-12 text-center">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-70" />
      <div className="relative mx-auto grid size-16 place-items-center">
        <span className="absolute inset-0 animate-ping-slow rounded-2xl bg-primary/25" />
        <span className="relative grid size-16 place-items-center rounded-2xl border border-primary/40 bg-secondary">
          <Icon className="size-7 text-primary" />
        </span>
      </div>
      <h2 className="relative mt-5 font-display text-2xl font-bold tracking-tight">{title}</h2>
      <p className="relative mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{body}</p>
      {actions ? <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

/** Label + value spec tile. */
export function SpecTile({ icon: Icon, label, value, sub }: { icon: IconType; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-secondary/70 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 truncate text-[13px] font-semibold text-foreground">{value}</div>
      {sub ? <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

/** Inline notice banner. */
export function Notice({
  tone = 'neutral',
  icon: Icon,
  children,
  action,
}: {
  tone?: 'neutral' | 'danger';
  icon?: IconType;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3.5 text-xs',
        tone === 'danger' ? 'border-primary/50 bg-primary/10' : 'border-border bg-secondary/70'
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5 text-muted-foreground">
        {Icon ? <Icon className={cn('mt-0.5 size-4 shrink-0', tone === 'danger' ? 'text-primary' : 'text-muted-foreground')} /> : null}
        <span className="leading-relaxed">{children}</span>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
};
