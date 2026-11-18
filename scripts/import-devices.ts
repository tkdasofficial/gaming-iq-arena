import fs from 'node:fs';
import path from 'node:path';
import { applicationDefault, cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';

interface AppletConfig {
  projectId: string;
  firestoreDatabaseId: string;
}

interface CheckpointState {
  completedIds: Record<string, string[]>;
  lastRunAt: string;
}

type CollectionKey = 'brands' | 'chipsets' | 'devices' | 'game_compatibility';

const COLLECTION_FILES: Record<CollectionKey, string> = {
  brands: 'brands.json',
  chipsets: 'chipsets.json',
  devices: 'devices.json',
  game_compatibility: 'game_compatibility.json',
};

const DATA_DIR = path.resolve(process.cwd(), 'data/smartphone-db');
const CONFIG_PATH = path.resolve(process.cwd(), 'firebase-applet-config.json');
const CHECKPOINT_PATH = path.resolve(process.cwd(), '.import-progress.json');
const MAX_BATCH_SIZE = 350;
const MAX_RETRIES = 4;

function loadConfig(): AppletConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Missing firebase-applet-config.json at ${CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as AppletConfig;
}

function initAdminFirestore(config: AppletConfig): Firestore {
  if (getApps().length === 0) {
    const inlineSa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (inlineSa) {
      const parsed = JSON.parse(inlineSa) as ServiceAccount;
      initializeApp({
        credential: cert(parsed),
        projectId: config.projectId,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const saPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      if (fs.existsSync(saPath)) {
        const parsed = JSON.parse(fs.readFileSync(saPath, 'utf8')) as ServiceAccount;
        initializeApp({
          credential: cert(parsed),
          projectId: config.projectId,
        });
      } else {
        initializeApp({
          credential: applicationDefault(),
          projectId: config.projectId,
        });
      }
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId: config.projectId,
      });
    }
  }
  return getFirestore(getApps()[0], config.firestoreDatabaseId);
}

function loadCheckpoint(): CheckpointState {
  if (!fs.existsSync(CHECKPOINT_PATH)) {
    return {
      completedIds: {
        brands: [],
        chipsets: [],
        devices: [],
        game_compatibility: [],
      },
      lastRunAt: new Date().toISOString(),
    };
  }
  return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8')) as CheckpointState;
}

function saveCheckpoint(state: CheckpointState): void {
  state.lastRunAt = new Date().toISOString();
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(state, null, 2) + '\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function commitWithRetry(
  fn: () => Promise<unknown>,
  label: string
): Promise<void> {
  let attempt = 0;
  while (true) {
    try {
      await fn();
      return;
    } catch (error) {
      attempt += 1;
      const msg = error instanceof Error ? error.message : String(error);
      const isTransient =
        msg.includes('UNAVAILABLE') ||
        msg.includes('DEADLINE_EXCEEDED') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('ABORTED');
      if (!isTransient || attempt > MAX_RETRIES) {
        throw new Error(`[${label}] Failed after ${attempt} attempt(s): ${msg}`);
      }
      const delayMs = Math.min(8000, 400 * 2 ** attempt);
      console.warn(`[${label}] Transient error, retrying in ${delayMs}ms... (${msg})`);
      await sleep(delayMs);
    }
  }
}

function loadCollectionJson(key: CollectionKey): Record<string, unknown>[] {
  const filePath = path.join(DATA_DIR, COLLECTION_FILES[key]);
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>[];
  const seen = new Set<string>();
  const deduped: Record<string, unknown>[] = [];
  for (const item of raw) {
    const id = String(item.id || '');
    if (!id || seen.has(id)) {
      console.warn(`[${key}] Skipping duplicate or empty id: "${id}"`);
      continue;
    }
    seen.add(id);
    deduped.push(item);
  }
  return deduped;
}

async function verifyCounts(db: Firestore, expected: Record<CollectionKey, number>): Promise<void> {
  console.log('\nVerifying Firestore collection counts...');
  for (const key of Object.keys(expected) as CollectionKey[]) {
    const agg = await db.collection(key).count().get();
    const actual = agg.data().count;
    console.log(`  - ${key}: ${actual} in Firestore (expected >= ${expected[key]})`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const verifyOnly = args.has('--verify-only');
  const force = args.has('--force');

  const config = loadConfig();
  console.log(
    `Target Firebase Project: ${config.projectId} | Database: ${config.firestoreDatabaseId}`
  );

  const collections: Record<CollectionKey, Record<string, unknown>[]> = {
    brands: loadCollectionJson('brands'),
    chipsets: loadCollectionJson('chipsets'),
    devices: loadCollectionJson('devices'),
    game_compatibility: loadCollectionJson('game_compatibility'),
  };

  console.log(
    `Loaded local dataset: brands=${collections.brands.length}, chipsets=${collections.chipsets.length}, devices=${collections.devices.length}, game_compatibility=${collections.game_compatibility.length}`
  );

  let db: Firestore;
  try {
    db = initAdminFirestore(config);
  } catch (error) {
    console.error(
      'Unable to initialize Firebase Admin SDK. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON for project',
      config.projectId,
      error
    );
    process.exit(1);
  }

  if (verifyOnly) {
    await verifyCounts(db, {
      brands: collections.brands.length,
      chipsets: collections.chipsets.length,
      devices: collections.devices.length,
      game_compatibility: collections.game_compatibility.length,
    });
    return;
  }

  const checkpoint = force
    ? {
        completedIds: { brands: [], chipsets: [], devices: [], game_compatibility: [] },
        lastRunAt: new Date().toISOString(),
      }
    : loadCheckpoint();

  for (const key of ['brands', 'chipsets', 'devices', 'game_compatibility'] as CollectionKey[]) {
    const records = collections[key];
    const doneSet = new Set(checkpoint.completedIds[key] || []);
    const pending = records.filter((r) => !doneSet.has(String(r.id)));

    if (pending.length === 0) {
      console.log(`[${key}] All ${records.length} documents already recorded in checkpoint.`);
      continue;
    }

    console.log(`[${key}] Importing ${pending.length}/${records.length} documents...`);
    const existingSnap = await db.collection(key).select().get();
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));

    for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
      const slice = pending.slice(i, i + MAX_BATCH_SIZE);
      const batch = db.batch();
      for (const item of slice) {
        const id = String(item.id);
        const ref = db.collection(key).doc(id);
        if (existingIds.has(id)) {
          const updateFields: Record<string, unknown> = { ...item };
          delete updateFields.id;
          delete updateFields.createdAt;
          updateFields.updatedAt = FieldValue.serverTimestamp();
          batch.update(ref, updateFields);
        } else {
          batch.set(ref, {
            ...item,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      const batchNum = Math.floor(i / MAX_BATCH_SIZE) + 1;
      await commitWithRetry(() => batch.commit(), `${key}-batch-${batchNum}`);
      for (const item of slice) {
        doneSet.add(String(item.id));
      }
      checkpoint.completedIds[key] = Array.from(doneSet);
      saveCheckpoint(checkpoint);
      console.log(
        `[${key}] Batch ${batchNum} committed (${Math.min(i + slice.length, pending.length)}/${pending.length})`
      );
    }
  }

  await verifyCounts(db, {
    brands: collections.brands.length,
    chipsets: collections.chipsets.length,
    devices: collections.devices.length,
    game_compatibility: collections.game_compatibility.length,
  });
  console.log('\nSmartphone database import complete.');
}

main().catch((err) => {
  console.error('Import failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
