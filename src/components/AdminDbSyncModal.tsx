import { useEffect, useState } from 'react';
import { CheckCircle2, Database, RefreshCw, X } from 'lucide-react';
import {
  fetchDatabaseCollectionCounts,
  syncBackendDatasetToFirestore,
  type DatasetCollectionCounts,
  type ImportProgress,
  type SyncDatasetResult,
} from '../firebase/adminImport';

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
        err instanceof Error ? err.message : 'Unable to read Firestore collection counts.'
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

  if (!isOpen) return null;

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const syncResult = await syncBackendDatasetToFirestore({
        overwriteExisting,
        onProgress: setProgress,
      });
      setResult(syncResult);
      setCounts(syncResult.counts);
      await onSyncComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to sync dataset to Firestore.'
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-sync-title"
    >
      <div className="w-full max-w-lg bg-[#141417] border border-[#29292F] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#29292F] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#F0263C]" />
            <h2
              id="admin-sync-title"
              className="font-display text-xl font-bold text-white tracking-tight"
            >
              Firestore Device Database Sync
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close database sync"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#1B1B20]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: 'Brands', value: counts?.brands },
              { label: 'Chipsets', value: counts?.chipsets },
              { label: 'Devices', value: counts?.devices },
              { label: 'Compat', value: counts?.game_compatibility },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3 rounded-xl bg-[#111114] border border-[#29292F]"
              >
                <div className="text-[11px] font-medium text-[#A1A1AA]">{item.label}</div>
                <div className="font-mono text-xl font-bold text-white tabular-nums mt-0.5">
                  {loadingCounts ? '—' : (item.value ?? 0)}
                </div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#111114] border border-[#29292F] text-xs text-[#A1A1AA] cursor-pointer">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              disabled={syncing}
              className="accent-[#F0263C]"
            />
            <span>Overwrite existing Firestore records while preserving createdAt</span>
          </label>

          {progress ? (
            <div className="p-3 rounded-xl bg-[#111114] border border-[#29292F] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-semibold">
                  Syncing {progress.collection}
                </span>
                <span className="font-mono text-[#A1A1AA] tabular-nums">
                  {progress.processed}/{progress.total}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#29292F] overflow-hidden">
                <div
                  className="h-full bg-[#F0263C] transition-all"
                  style={{
                    width: `${
                      progress.total > 0
                        ? Math.round((progress.processed / progress.total) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="text-[11px] font-mono text-[#71717A] tabular-nums">
                Created: {progress.created} · Updated: {progress.updated} · Skipped:{' '}
                {progress.skipped}
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="p-3 rounded-xl bg-[#1B1B20] border border-[#29292F] flex items-start gap-2.5 text-xs text-white">
              <CheckCircle2 className="w-4 h-4 text-[#F0263C] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Firestore Sync Complete</div>
                <div className="text-[#A1A1AA] font-mono mt-0.5">
                  Created {result.created} · Updated {result.updated} · Skipped{' '}
                  {result.skipped}
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="p-3 rounded-xl bg-[#F0263C]/10 border border-[#F0263C] text-xs text-[#F0263C]">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => void loadCounts()}
              disabled={syncing || loadingCounts}
              className="min-h-[42px] px-3.5 rounded-xl bg-[#1B1B20] border border-[#29292F] text-xs font-semibold text-[#A1A1AA] hover:text-white inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Counts</span>
            </button>
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={syncing}
              className="min-h-[42px] px-4 rounded-xl bg-[#F0263C] hover:bg-[#B8172A] disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{syncing ? 'Syncing Dataset...' : 'Sync Backend Dataset'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
