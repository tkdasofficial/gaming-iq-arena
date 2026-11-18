import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Globe, LogIn, Plus, Trash2, User } from 'lucide-react';
import type { GameId, ProPreset } from '../engine/types';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, Segmented } from './giq/primitives';

interface PresetsViewProps {
  presets: ProPreset[];
  loaded: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  onApplyPreset: (preset: ProPreset) => void;
  onDeletePreset: (presetId: string) => Promise<void>;
  onGoToCalibrate: () => void;
  onRequestSignIn: () => void;
}

type FilterOption = 'all' | GameId;

export function PresetsView({
  presets,
  loaded,
  currentUserId,
  isAdmin,
  onApplyPreset,
  onDeletePreset,
  onGoToCalibrate,
  onRequestSignIn,
}: PresetsViewProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPresets = useMemo(() => {
    if (filter === 'all') return presets;
    return presets.filter((p) => p.game === filter);
  }, [filter, presets]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeletePreset(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Community"
        title="Pro presets"
        subtitle="Setups shared by Gaming IQ players. Tap one to load it into the calibrator."
      />

      <Segmented
        layoutId="preset-filter"
        ariaLabel="Filter by game"
        className="sm:max-w-sm"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'All' },
          { id: 'free-fire', label: 'Free Fire' },
          { id: 'pubg-bgmi', label: 'BGMI' },
        ]}
      />

      {!loaded ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton h-60 rounded-3xl" />
          ))}
        </div>
      ) : filteredPresets.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No presets yet"
          body="Generate a profile in the calibrator and tap Publish to share the first one."
          actions={
            <>
              <Button variant="glow" size="md" onClick={onGoToCalibrate}>
                <Plus /> Calibrate & publish
              </Button>
              {!currentUserId ? (
                <Button variant="surface" size="md" onClick={onRequestSignIn}>
                  <LogIn /> Sign in
                </Button>
              ) : null}
            </>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPresets.map((preset, i) => {
            const canDelete = Boolean(currentUserId) && (preset.authorId === currentUserId || isAdmin);
            const isFF = preset.game === 'free-fire';
            return (
              <motion.article
                key={preset.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.35 }}
                className="surface group relative flex flex-col overflow-hidden rounded-3xl p-4 transition-colors hover:border-border-strong"
              >
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-hero opacity-60" />
                <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                    <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {isFF ? 'Free Fire' : 'BGMI'}
                    </span>
                    <span className="truncate rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {preset.claw.replace('-finger', ' finger')}
                      {!isFF ? ` · gyro ${preset.gyro.replace('-', ' ')}` : ''}
                    </span>
                  </div>
                  {canDelete ? (
                    <button
                      type="button"
                      disabled={deletingId === preset.id}
                      onClick={() => void handleDelete(preset.id)}
                      aria-label={`Delete ${preset.name}`}
                      className="grid size-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>

                <h2 className="relative mt-3 line-clamp-2 font-display text-2xl font-bold leading-tight tracking-tight">
                  {preset.name}
                </h2>
                <p className="relative mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <User className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {preset.authorName} · {preset.playerArchetype}
                  </span>
                </p>

                <div className="relative mt-3 rounded-2xl border border-border bg-background/50 px-3 py-2.5 font-mono text-sm font-semibold tabular-nums">
                  {preset.headlineMetric}
                </div>

                {preset.description ? (
                  <p className="relative mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{preset.description}</p>
                ) : null}

                <div className="mt-auto pt-4">
                  <Button variant="surface" size="md" className="w-full group-hover:border-primary/60" onClick={() => onApplyPreset(preset)}>
                    Apply preset
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
