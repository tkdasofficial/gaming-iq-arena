import { useEffect, useState } from 'react';
import { CheckCircle2, Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet } from './giq/Sheet';
import {
  fetchDatabaseCollectionCounts,
  syncBackendDatasetToCloud,
  type DatasetCollectionCounts,
  type ImportProgress,
  type SyncDatasetResult,
} from '../backend/adminImport';

interface AdminDbSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => Promise<void>;
}

export function AdminDbSyncModal({
  isOpen,
  onClose,
  onSyncComplete,
}: AdminDbSyncModalProps) {
  const [counts, setCounts] = useState<DatasetCollectionCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<SyncDatasetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCounts = async () => {
    setLoadingCounts(true);
    setError(null);
    try {
      const next = await fetchDatabaseCollectionCounts();
      setCounts(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to read cloud catalog counts.'
      );
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setProgress(null);
      void loadCounts();
    }
  }, [isOpen]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const syncResult = await syncBackendDatasetToCloud({
        overwriteExisting,
        onProgress: setProgress,
      });
      setResult(syncResult);
      setCounts(syncResult.counts);
      await onSyncComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to sync dataset to the cloud.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const pct = progress && progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      labelId="admin-sync-title"
      title="Phone catalog sync"
      subtitle="Load the bundled phone list into your cloud catalog."
      className="md:max-w-lg"
      footer={
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
          <Button
            variant="surface"
            size="md"
            onClick={() => void loadCounts()}
            disabled={syncing || loadingCounts}
            aria-label="Refresh counts"
            className="w-11 px-0"
          >
            <RefreshCw className={loadingCounts ? 'animate-spin' : ''} />
          </Button>
          <Button variant="glow" size="md" onClick={() => void handleSync()} disabled={syncing}>
            <Database />
            {syncing ? 'Syncing…' : 'Sync catalog'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 overflow-y-auto px-5 pb-5">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Brands', value: counts?.brands },
            { label: 'Chips', value: counts?.chipsets },
            { label: 'Phones', value: counts?.devices },
            { label: 'Compat', value: counts?.game_compatibility },
          ].map((item) => (
            <div key={item.label} className="min-w-0 rounded-2xl border border-border bg-secondary/70 p-2.5 text-center">
              <div className="font-mono text-lg font-bold tabular-nums">{loadingCounts ? '—' : (item.value ?? 0)}</div>
              <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-subtle">{item.label}</div>
            </div>
          ))}
        </div>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/70 p-3.5 text-sm">
          <span className="min-w-0">
            <span className="block font-semibold">Overwrite existing</span>
            <span className="block text-xs text-muted-foreground">Replace records already in the cloud</span>
          </span>
          <Switch checked={overwriteExisting} onCheckedChange={setOverwriteExisting} disabled={syncing} />
        </label>

        {progress ? (
          <div className="space-y-2 rounded-2xl border border-border bg-secondary/70 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Syncing {progress.collection}</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {progress.processed}/{progress.total}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div className="h-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="font-mono text-[11px] tabular-nums text-subtle">
              +{progress.created} new · {progress.updated} updated · {progress.skipped} skipped
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-success/40 bg-success/10 p-3.5 text-xs">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            <div>
              <div className="font-semibold">Sync complete</div>
              <div className="mt-0.5 font-mono text-muted-foreground">
                {result.created} new · {result.updated} updated · {result.skipped} skipped
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-primary/50 bg-primary/10 p-3.5 text-xs font-medium text-primary">{error}</div>
        ) : null}
      </div>
    </Sheet>
  );
}
