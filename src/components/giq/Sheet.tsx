import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
  labelId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  labelId: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className={cn(
              'relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-border-strong bg-card shadow-float md:max-w-2xl md:rounded-[28px]',
              className
            )}
          >
            <div className="flex justify-center pt-2.5 md:hidden">
              <span className="h-1 w-10 rounded-full bg-surface-3" />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-5 pb-3 pt-3 md:pt-5">
              <div className="min-w-0">
                <h2 id={labelId} className="truncate font-display text-2xl font-bold tracking-tight">
                  {title}
                </h2>
                {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-10 place-items-center rounded-xl border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            {footer ? <div className="border-t border-border px-5 py-4 pb-safe">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
