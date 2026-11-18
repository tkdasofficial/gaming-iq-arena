import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { clearDeviceDatabaseCache } from './deviceDatabase';
import { handleBackendError, OperationType } from './errors';

export type DatasetCollectionName = 'brands' | 'chipsets' | 'devices' | 'game_compatibility';

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
const TABLES: DatasetCollectionName[] = ['brands', 'chipsets', 'devices', 'game_compatibility'];

async function countRows(table: DatasetCollectionName): Promise<number> {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) handleBackendError(error, OperationType.LIST, table);
  return count ?? 0;
}

export async function fetchDatabaseCollectionCounts(): Promise<DatasetCollectionCounts> {
  const [brands, chipsets, devices, game_compatibility] = await Promise.all(
    TABLES.map((t) => countRows(t))
  );
  return {
    brands: brands ?? 0,
    chipsets: chipsets ?? 0,
    devices: devices ?? 0,
    game_compatibility: game_compatibility ?? 0,
  };
}

async function fetchExistingIds(table: DatasetCollectionName): Promise<Set<string>> {
  const ids = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .range(from, from + pageSize - 1);
    if (error) handleBackendError(error, OperationType.LIST, table);
    (data ?? []).forEach((r) => ids.add(r.id));
    if (!data || data.length < pageSize) break;
  }
  return ids;
}

function toRow(table: DatasetCollectionName, item: Record<string, unknown>) {
  const id = String(item.id);
  const data = JSON.parse(JSON.stringify(item)) as Json;
  if (table === 'devices') {
    return {
      id,
      brand_id: String(item.brandId ?? ''),
      release_date: String(item.releaseDate ?? ''),
      data,
    };
  }
  if (table === 'game_compatibility') {
    return { id, device_id: String(item.deviceId ?? ''), data };
  }
  return { id, data };
}

/** Copies the bundled phone dataset into the Supabase catalog tables (admins only). */
export async function syncBackendDatasetToCloud(options: {
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
    const existingIds = await fetchExistingIds(col.name);
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
      const toWrite: ReturnType<typeof toRow>[] = [];
      for (const item of chunk) {
        const id = String(item.id);
        if (existingIds.has(id)) {
          if (!options.overwriteExisting) {
            totalSkipped += 1;
            continue;
          }
          totalUpdated += 1;
        } else {
          totalCreated += 1;
        }
        toWrite.push(toRow(col.name, item));
      }

      if (toWrite.length > 0) {
        // Upsert keeps created_at on existing rows; updated_at is bumped by trigger.
        const { error } = await supabase
          .from(col.name)
          .upsert(toWrite as never, { onConflict: 'id' });
        if (error) handleBackendError(error, OperationType.WRITE, col.name);
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
  return { created: totalCreated, updated: totalUpdated, skipped: totalSkipped, counts };
}
