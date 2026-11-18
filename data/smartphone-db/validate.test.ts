import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

interface BrandEntry {
  id: string;
  visibility: string;
  name: string;
  parentCompany: string | null;
  country: string;
  isSubBrand: boolean;
  deviceCount: number;
  latestReleaseYear: number;
}

interface ChipsetEntry {
  id: string;
  visibility: string;
  manufacturer: string;
  name: string;
  processorModel: string | null;
  cpuArchitecture: string | null;
  cpuCores: number | null;
  cpuCoreConfig: string | null;
  maxClockSpeedGhz: number | null;
  processNodeNm: number | null;
  gpuManufacturer: string;
  gpuModel: string;
  gpuArchitecture: string | null;
  gpuClockMhz: number | null;
  tier: string;
}

interface DeviceEntry {
  id: string;
  visibility: string;
  deviceType: string;
  brandId: string;
  brand: string;
  model: string;
  modelNumber: string | null;
  codename: string | null;
  manufacturer: string;
  os: string;
  osVersionLaunch: string | null;
  releaseDate: string;
  releaseYear: number;
  marketAvailability: string | null;
  regionalVariants: string[];
  tier: string;
  chipsetId: string;
  chipsetName: string;
  gpuModel: string;
  ramVariantsGb: number[];
  ramType: string | null;
  virtualRamSupport: boolean | null;
  storageVariantsGb: number[];
  storageType: string | null;
  display: {
    sizeInches: number;
    panelType: string | null;
    resolution: string;
    refreshHz: number;
    touchSamplingHz: number | null;
    peakBrightnessNits: number | null;
  };
  batteryMah: number | null;
  chargingWatt: number | null;
  wirelessChargingWatt: number | null;
  gyroscopeSupport: string;
  softwareSupportYears: number | null;
  sources: { title: string; url: string }[];
  verificationStatus: string;
  completenessStatus: string;
}

interface CompatibilityEntry {
  id: string;
  visibility: string;
  deviceId: string;
  gameKey: string;
  supportedFps: number[];
  maxVerifiedFps: number | null;
  graphicsSettings: string | null;
  gyroscopeSupport: string;
  compatibilityRegion: string | null;
  sourceUrl: string | null;
  verificationStatus: string;
  lastVerifiedAt: string | null;
}

const DATA_DIR = path.resolve(process.cwd(), 'data/smartphone-db');
const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

const brands: BrandEntry[] = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, 'brands.json'), 'utf8')
);
const chipsets: ChipsetEntry[] = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, 'chipsets.json'), 'utf8')
);
const devices: DeviceEntry[] = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, 'devices.json'), 'utf8')
);
const compatibility: CompatibilityEntry[] = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, 'game_compatibility.json'), 'utf8')
);

test('All dataset collections have valid, unique Firestore IDs and zero duplicate models', () => {
  const brandIds = new Set<string>();
  for (const b of brands) {
    assert.match(b.id, VALID_ID_REGEX, `Invalid brand id: ${b.id}`);
    assert.ok(b.id.length <= 128);
    assert.equal(b.visibility, 'public');
    assert.ok(!brandIds.has(b.id), `Duplicate brand id: ${b.id}`);
    brandIds.add(b.id);
  }

  const chipsetIds = new Set<string>();
  for (const c of chipsets) {
    assert.match(c.id, VALID_ID_REGEX, `Invalid chipset id: ${c.id}`);
    assert.ok(c.id.length <= 128);
    assert.equal(c.visibility, 'public');
    assert.ok(!chipsetIds.has(c.id), `Duplicate chipset id: ${c.id}`);
    chipsetIds.add(c.id);
  }

  const deviceIds = new Set<string>();
  const brandModelPairs = new Set<string>();
  for (const d of devices) {
    assert.match(d.id, VALID_ID_REGEX, `Invalid device id: ${d.id}`);
    assert.ok(d.id.length <= 128);
    assert.equal(d.visibility, 'public');
    assert.ok(!deviceIds.has(d.id), `Duplicate device id: ${d.id}`);
    deviceIds.add(d.id);

    const pair = `${d.brandId}::${d.model.trim().toLowerCase()}`;
    assert.ok(!brandModelPairs.has(pair), `Duplicate brand/model pair: ${pair}`);
    brandModelPairs.add(pair);
  }

  const compatIds = new Set<string>();
  for (const gc of compatibility) {
    assert.match(gc.id, VALID_ID_REGEX, `Invalid compat id: ${gc.id}`);
    assert.ok(gc.id.length <= 128);
    assert.equal(gc.visibility, 'public');
    assert.ok(!compatIds.has(gc.id), `Duplicate compat id: ${gc.id}`);
    compatIds.add(gc.id);
  }
});

test('Referential integrity holds across brands, chipsets, devices, and game_compatibility', () => {
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const chipsetIds = new Set(chipsets.map((c) => c.id));
  const deviceIds = new Set(devices.map((d) => d.id));

  const observedCounts = new Map<string, number>();
  const observedMaxYear = new Map<string, number>();

  for (const d of devices) {
    assert.ok(brandMap.has(d.brandId), `Missing brandId ${d.brandId} on ${d.id}`);
    assert.ok(chipsetIds.has(d.chipsetId), `Missing chipsetId ${d.chipsetId} on ${d.id}`);
    observedCounts.set(d.brandId, (observedCounts.get(d.brandId) ?? 0) + 1);
    observedMaxYear.set(
      d.brandId,
      Math.max(observedMaxYear.get(d.brandId) ?? 0, d.releaseYear)
    );
  }

  for (const b of brands) {
    assert.equal(
      b.deviceCount,
      observedCounts.get(b.id) ?? 0,
      `Brand ${b.id} deviceCount mismatch`
    );
    assert.equal(
      b.latestReleaseYear,
      observedMaxYear.get(b.id) ?? 2023,
      `Brand ${b.id} latestReleaseYear mismatch`
    );
  }

  for (const gc of compatibility) {
    assert.ok(deviceIds.has(gc.deviceId), `Missing deviceId ${gc.deviceId} on ${gc.id}`);
  }
});

test('Strictly smartphones only (2023-2026) and separate sub-brands maintained', () => {
  assert.ok(brands.some((b) => b.id === 'redmi' && b.isSubBrand));
  assert.ok(brands.some((b) => b.id === 'poco' && b.isSubBrand));
  assert.ok(brands.some((b) => b.id === 'iqoo' && b.isSubBrand));
  assert.ok(brands.some((b) => b.id === 'nubia' && b.isSubBrand));
  assert.ok(brands.some((b) => b.id === 'xiaomi' && !b.isSubBrand));
  assert.ok(brands.some((b) => b.id === 'vivo' && !b.isSubBrand));

  for (const d of devices) {
    assert.equal(d.deviceType, 'smartphone', `Non-smartphone found: ${d.id}`);
    assert.ok(
      d.display.sizeInches >= 4.5 && d.display.sizeInches <= 8.5,
      `Display size out of smartphone bounds on ${d.id}: ${d.display.sizeInches}`
    );
    assert.ok(d.releaseDate >= '2023-01-01', `Device before 2023 on ${d.id}: ${d.releaseDate}`);
    assert.ok(d.releaseYear >= 2023 && d.releaseYear <= 2026);
    assert.ok(d.ramVariantsGb.length >= 1);
    assert.ok(d.storageVariantsGb.length >= 1);
    assert.ok(d.sources.length >= 1);
  }
});

test('Unverified FPS compatibility entries never fabricate 120 FPS from 120Hz displays', () => {
  for (const gc of compatibility) {
    if (gc.verificationStatus === 'unverified') {
      assert.deepEqual(gc.supportedFps, []);
      assert.equal(gc.maxVerifiedFps, null);
    } else {
      assert.equal(gc.verificationStatus, 'verified');
      assert.ok(gc.supportedFps.length > 0);
      assert.ok(typeof gc.maxVerifiedFps === 'number');
    }
  }
});
