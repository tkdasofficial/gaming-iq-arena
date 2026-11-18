import { useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Check, Copy, LogIn, Smartphone, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { formatDeviceFullName } from '../engine/devices';
import type { SavedSetup } from '../engine/types';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader } from './giq/primitives';

interface SavedViewProps {
  savedSetups: SavedSetup[];
  isSignedIn: boolean;
  authReady: boolean;
  onSignIn: () => void;
  onLoadSetup: (setup: SavedSetup) => void;
  onDeleteSetup: (id: string) => Promise<void>;
  onCopySetupObject: (setup: SavedSetup) => void;
  onGoToCalibrate: () => void;
}

export function SavedView({
  savedSetups,
  isSignedIn,
  authReady,
  onSignIn,
  onLoadSetup,
  onDeleteSetup,
  onCopySetupObject,
  onGoToCalibrate,
}: SavedViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCopy = (setup: SavedSetup) => {
    onCopySetupObject(setup);
    setCopiedId(setup.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteSetup(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Your library"
        title="Saved profiles"
        subtitle="Your setups, synced to your account on every device."
        action={
          isSignedIn && savedSetups.length > 0 ? (
            <span className="rounded-xl border border-border bg-secondary px-3 py-2 font-mono text-sm font-bold tabular-nums">
              {savedSetups.length}
            </span>
          ) : undefined
        }
      />

      {authReady && !isSignedIn ? (
        <EmptyState
          icon={LogIn}
          title="Sign in to see your saves"
          body="Saved profiles live in your account, so they follow you to any phone."
          actions={
            <Button variant="glow" size="md" onClick={onSignIn}>
              <LogIn /> Sign in
            </Button>
          }
        />
      ) : savedSetups.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          body="Generate a profile and tap Save — it'll show up here."
          actions={
            <Button variant="glow" size="md" onClick={onGoToCalibrate}>
              <SlidersHorizontal /> Open calibrator
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {savedSetups.map((setup, i) => {
            const isFF = setup.input.game === 'free-fire';
            const previewEntries = Object.entries(setup.sliders).slice(0, 3);
            const isCopied = copiedId === setup.id;
            return (
              <motion.article
                key={setup.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.35 }}
                className="surface relative overflow-hidden rounded-3xl p-4"
              >
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-hero opacity-50" />
                <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {isFF ? 'Free Fire' : 'BGMI'}
                    </span>
                    <h2 className="mt-2.5 truncate font-display text-2xl font-bold leading-tight tracking-tight">{setup.name}</h2>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Smartphone className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {formatDeviceFullName(setup.input.device.brand, setup.input.device.model)} ·{' '}
                        {setup.input.claw.replace('-finger', 'F')} · {setup.input.playstyle.replace('-', ' ')}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={deletingId === setup.id}
                    onClick={() => void handleDelete(setup.id)}
                    aria-label={`Delete ${setup.name}`}
                    className="grid size-9 place-items-center rounded-xl text-subtle transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="relative mt-4 grid grid-cols-3 gap-2">
                  {previewEntries.map(([key, val]) => (
                    <div key={key} className="min-w-0 rounded-2xl border border-border bg-background/50 px-3 py-2.5">
                      <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-subtle">
                        {key.replace(/^(ff-|cam-|ads-|gyro-|fl-)/, '').replace(/-/g, ' ')}
                      </div>
                      <div className="mt-0.5 font-mono text-lg font-bold tabular-nums">
                        {val}
                        {!isFF ? <span className="text-xs text-primary">%</span> : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative mt-4 grid grid-cols-2 gap-2">
                  <Button variant="glow" size="md" onClick={() => onLoadSetup(setup)}>
                    <Upload /> Load
                  </Button>
                  <Button variant="surface" size="md" onClick={() => handleCopy(setup)} className={isCopied ? 'text-success' : ''}>
                    {isCopied ? <Check /> : <Copy />}
                    {isCopied ? 'Copied' : 'Copy'}
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
