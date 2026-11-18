import { useState } from 'react';
import { ArrowLeft, Bookmark, Check, Copy, LogIn, SlidersHorizontal, Trash2 } from 'lucide-react';
import { formatRecommendationText } from '../engine/recommend';
import { removeSavedResult, type SavedResult } from '../backend/services';
import { useBackend } from '../backend/BackendContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ResultsView } from './ResultsView';
import { EmptyState, Notice, PageHeader } from './giq/primitives';

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function SavedView({ onGoToGenerate }: { onGoToGenerate: () => void }) {
  const { user, authReady, savedResults, savedLoaded, savedError, requestSignIn } = useBackend();
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<SavedResult | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const open = savedResults.find((s) => s.id === openId);

  const copy = async (item: SavedResult) => {
    try {
      await navigator.clipboard.writeText(formatRecommendationText(item.recommendation));
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const doDelete = async () => {
    if (!user || !confirm) return;
    setDeleteError(null);
    try {
      await removeSavedResult(user.uid, confirm.id);
      if (openId === confirm.id) setOpenId(null);
    } catch {
      setDeleteError('Could not delete that result. Please try again.');
    } finally {
      setConfirm(null);
    }
  };

  if (open) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setOpenId(null)} className="-ml-2 text-muted-foreground">
          <ArrowLeft /> Back to history
        </Button>
        <ResultsView rec={open.recommendation} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={onGoToGenerate} className="-ml-2 -mb-2 text-muted-foreground">
        <ArrowLeft /> Back to generator
      </Button>
      <PageHeader eyebrow="Your library" title="History" subtitle="Sensitivity settings you saved, available on any device you sign in to." />

      {!authReady || (user && !savedLoaded) ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      ) : !user ? (
        <EmptyState
          icon={LogIn}
          title="Sign in to see your saved results"
          body="Saved settings live in your account so they follow you to any phone."
          actions={
            <Button onClick={requestSignIn} size="md">
              <LogIn /> Sign in
            </Button>
          }
        />
      ) : savedError ? (
        <Notice tone="danger">{savedError}</Notice>
      ) : savedResults.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          body="Generate settings for your phone and tap Save. They’ll appear here."
          actions={
            <Button onClick={onGoToGenerate} size="md">
              <SlidersHorizontal /> Generate settings
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {deleteError ? <Notice tone="danger">{deleteError}</Notice> : null}
          {savedResults.map((item) => {
            const rec = item.recommendation;
            return (
              <li key={item.id} className="surface rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => setOpenId(item.id)} className="min-w-0 text-left focus-visible:outline-none focus-visible:underline">
                    <div className="truncate text-sm font-semibold">{rec.device.fullName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {rec.gameName} · {dateFmt.format(new Date(item.createdAt))}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(item)}
                    aria-label={`Delete ${item.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
                  {rec.core.slice(0, 3).map((c) => (
                    <div key={c.id} className="bg-card px-3 py-2">
                      <div className="truncate text-[11px] text-muted-foreground">{c.label}</div>
                      <div className="font-mono text-base font-medium tabular-nums">
                        {c.value}
                        {rec.unit}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpenId(item.id)}>
                    View all
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void copy(item)}>
                    {copiedId === item.id ? <Check /> : <Copy />}
                    {copiedId === item.id ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this saved result?</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.name} will be removed from your account.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
