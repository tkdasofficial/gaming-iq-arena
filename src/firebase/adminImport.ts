import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { clearDeviceDatabaseCache } from './deviceDatabase';
import { handleFirestoreError, OperationType } from './errors';

export type DatasetCollectionName =
  | 'brands'
  | 'chipsets'
  | 'devices'
  | 'game_compatibility';

export interface DatasetCollectionCounts {
  brands: number;
  chipsets: number;
  devices: number;
  game_compatibility: number;
}

export interface ImportProgress {
  collection: DatasetCollectionName;
  processed: number;
  total: number;
  created: number;
  updated: number;
  skipped: number;
}

export interface SyncDatasetResult {
  created: number;
  updated: number;
  skipped: number;
  counts: DatasetCollectionCounts;
}

const BATCH_SIZE = 250;

export async function fetchDatabaseCollectionCounts(): Promise<DatasetCollectionCounts> {
  try {
    const [brandsSnap, chipsetsSnap, devicesSnap, compatSnap] = await Promise.all([
      getCountFromServer(query(collection(db, 'brands'), where('visibility', '==', 'public'))),
      getCountFromServer(query(collection(db, 'chipsets'), where('visibility', '==', 'public'))),
      getCountFromServer(query(collection(db, 'devices'), where('visibility', '==', 'public'))),
      getCountFromServer(
        query(collection(db, 'game_compatibility'), where('visibility', '==', 'public'))
      ),
    ]);
    return {
      brands: brandsSnap.data().count,
      chipsets: chipsetsSnap.data().count,
      devices: devicesSnap.data().count,
      game_compatibility: compatSnap.data().count,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'devices');
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function commitBatchWithRetry(
  commitFn: () => Promise<void>,
  maxRetries = 3
): Promise<void> {
  let attempt = 0;
  while (true) {
    try {
      await commitFn();
      return;
    } catch (error) {
      attempt += 1;
      const msg = error instanceof Error ? error.message : String(error);
      const transient =
        msg.includes('unavailable') ||
        msg.includes('deadline-exceeded') ||
        msg.includes('resource-exhausted') ||
        msg.includes('aborted');
      if (!transient || attempt > maxRetries) {
        throw error;
      }
      await sleep(350 * 2 ** attempt);
    }
  }
}

export async function syncBackendDatasetToFirestore(options: {
  overwriteExisting?: boolean;
  onProgress?: (progress: ImportProgress) => void;
}): Promise<SyncDatasetResult> {
  const res = await fetch('/api/admin/dataset');
  if (!res.ok) {
    throw new Error(`Failed to load backend dataset (${res.status})`);
  }
  const dataset = (await res.json()) as {
    brands: Record<string, unknown>[];
    chipsets: Record<string, unknown>[];
    devices: Record<string, unknown>[];
    gameCompatibility: Record<string, unknown>[];
  };

  const collections: { name: DatasetCollectionName; rows: Record<string, unknown>[] }[] = [
    { name: 'brands', rows: dataset.brands || [] },
    { name: 'chipsets', rows: dataset.chipsets || [] },
    { name: 'devices', rows: dataset.devices || [] },
    { name: 'game_compatibility', rows: dataset.gameCompatibility || [] },
  ];

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const col of collections) {
    const existingSnap = await getDocs(
      query(collection(db, col.name), where('visibility', '==', 'public'))
    );
    const existingIds = new Set<string>();
    existingSnap.forEach((docSnap) => existingIds.add(docSnap.id));

    const seen = new Set<string>();
    const dedupedRows = col.rows.filter((row) => {
      const id = String(row.id || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    let processed = 0;
    for (let i = 0; i < dedupedRows.length; i += BATCH_SIZE) {
      const chunk = dedupedRows.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      let opsInBatch = 0;

      for (const item of chunk) {
        const id = String(item.id);
        const ref = doc(db, col.name, id);
        if (existingIds.has(id)) {
          if (!options.overwriteExisting) {
            totalSkipped += 1;
            continue;
          }
          const updatePayload: Record<string, unknown> = { ...item };
          delete updatePayload.id;
          delete updatePayload.createdAt;
          updatePayload.updatedAt = serverTimestamp();
          batch.update(ref, updatePayload);
          totalUpdated += 1;
          opsInBatch += 1;
        } else {
          batch.set(ref, {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          totalCreated += 1;
          opsInBatch += 1;
        }
      }

      if (opsInBatch > 0) {
        try {
          await commitBatchWithRetry(() => batch.commit());
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, col.name);
        }
      }

      processed += chunk.length;
      options.onProgress?.({
        collection: col.name,
        processed,
        total: dedupedRows.length,
        created: totalCreated,
        updated: totalUpdated,
        skipped: totalSkipped,
      });
    }
  }

  clearDeviceDatabaseCache();
  const counts = await fetchDatabaseCollectionCounts();
  return {
    created: totalCreated,
    updated: totalUpdated,
    skipped: totalSkipped,
    counts,
  };
}
