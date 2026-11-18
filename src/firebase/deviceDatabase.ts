import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { smartphoneRecordToDeviceProfile } from '../engine/devices';
import type {
  BrandRecord,
  ChipsetRecord,
  DeviceProfile,
  GameCompatibilityRecord,
  SmartphoneDeviceRecord,
} from '../engine/types';
import { db } from './config';
import { handleFirestoreError, OperationType } from './errors';

let brandsCache: BrandRecord[] | null = null;
const brandDevicesCache = new Map<string, DeviceProfile[]>();
const chipsetCache = new Map<string, ChipsetRecord | null>();
const compatCache = new Map<string, GameCompatibilityRecord[]>();
let catalogCache: DeviceProfile[] | null = null;

export function clearDeviceDatabaseCache(): void {
  brandsCache = null;
  brandDevicesCache.clear();
  chipsetCache.clear();
  compatCache.clear();
  catalogCache = null;
}

function hydrateDeviceDoc(raw: Record<string, unknown>, id: string): SmartphoneDeviceRecord {
  const displayRaw = (raw.display || {}) as Record<string, unknown>;
  return {
    id: String(raw.id || id),
    visibility: 'public',
    deviceType: 'smartphone',
    brandId: String(raw.brandId || ''),
    brand: String(raw.brand || ''),
    model: String(raw.model || ''),
    modelNumber: typeof raw.modelNumber === 'string' ? raw.modelNumber : null,
    codename: typeof raw.codename === 'string' ? raw.codename : null,
    manufacturer: String(raw.manufacturer || ''),
    os:
      raw.os === 'iOS'
        ? 'iOS'
        : raw.os === 'HarmonyOS'
          ? 'HarmonyOS'
          : 'Android',
    osVersionLaunch:
      typeof raw.osVersionLaunch === 'string' ? raw.osVersionLaunch : null,
    releaseDate: String(raw.releaseDate || '2024-01-01'),
    releaseYear: Number(raw.releaseYear) || 2024,
    marketAvailability:
      typeof raw.marketAvailability === 'string' ? raw.marketAvailability : null,
    regionalVariants: Array.isArray(raw.regionalVariants)
      ? raw.regionalVariants.map(String)
      : [],
    tier: (raw.tier as SmartphoneDeviceRecord['tier']) || 'Mid-Range',
    chipsetId: String(raw.chipsetId || ''),
    chipsetName: String(raw.chipsetName || 'Mobile SoC'),
    gpuModel: String(raw.gpuModel || ''),
    ramVariantsGb: Array.isArray(raw.ramVariantsGb)
      ? raw.ramVariantsGb.map(Number)
      : [8],
    ramType: typeof raw.ramType === 'string' ? raw.ramType : null,
    virtualRamSupport:
      typeof raw.virtualRamSupport === 'boolean' ? raw.virtualRamSupport : null,
    storageVariantsGb: Array.isArray(raw.storageVariantsGb)
      ? raw.storageVariantsGb.map(Number)
      : [128],
    storageType: typeof raw.storageType === 'string' ? raw.storageType : null,
    display: {
      sizeInches: Number(displayRaw.sizeInches) || 6.7,
      panelType: typeof displayRaw.panelType === 'string' ? displayRaw.panelType : null,
      resolution: String(displayRaw.resolution || '2400 × 1080'),
      refreshHz: Number(displayRaw.refreshHz) || 120,
      touchSamplingHz:
        typeof displayRaw.touchSamplingHz === 'number'
          ? displayRaw.touchSamplingHz
          : null,
      peakBrightnessNits:
        typeof displayRaw.peakBrightnessNits === 'number'
          ? displayRaw.peakBrightnessNits
          : null,
    },
    batteryMah: typeof raw.batteryMah === 'number' ? raw.batteryMah : null,
    chargingWatt: typeof raw.chargingWatt === 'number' ? raw.chargingWatt : null,
    wirelessChargingWatt:
      typeof raw.wirelessChargingWatt === 'number' ? raw.wirelessChargingWatt : null,
    gyroscopeSupport:
      (raw.gyroscopeSupport as SmartphoneDeviceRecord['gyroscopeSupport']) || 'unknown',
    softwareSupportYears:
      typeof raw.softwareSupportYears === 'number' ? raw.softwareSupportYears : null,
    sources: Array.isArray(raw.sources)
      ? (raw.sources as SmartphoneDeviceRecord['sources'])
      : [],
    verificationStatus:
      raw.verificationStatus === 'partial' ? 'partial' : 'verified',
    completenessStatus:
      raw.completenessStatus === 'partial' ? 'partial' : 'complete',
  };
}

export async function fetchBrands(forceRefresh = false): Promise<BrandRecord[]> {
  if (!forceRefresh && brandsCache) {
    return brandsCache;
  }
  const path = 'brands';
  try {
    const q = query(collection(db, 'brands'), where('visibility', '==', 'public'));
    const snap = await getDocs(q);
    const items: BrandRecord[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      items.push({
        id: String(d.id || docSnap.id),
        visibility: 'public',
        name: String(d.name || docSnap.id),
        parentCompany: typeof d.parentCompany === 'string' ? d.parentCompany : null,
        country: String(d.country || ''),
        isSubBrand: Boolean(d.isSubBrand),
        deviceCount: Number(d.deviceCount) || 0,
        latestReleaseYear: Number(d.latestReleaseYear) || 2023,
      });
    });
    items.sort((a, b) => a.name.localeCompare(b.name));
    brandsCache = items;
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchChipsetById(chipsetId: string): Promise<ChipsetRecord | null> {
  if (!chipsetId) return null;
  if (chipsetCache.has(chipsetId)) {
    return chipsetCache.get(chipsetId) ?? null;
  }
  const path = `chipsets/${chipsetId}`;
  try {
    const snap = await getDoc(doc(db, 'chipsets', chipsetId));
    if (!snap.exists()) {
      chipsetCache.set(chipsetId, null);
      return null;
    }
    const d = snap.data();
    const record: ChipsetRecord = {
      id: String(d.id || snap.id),
      visibility: 'public',
      manufacturer: String(d.manufacturer || ''),
      name: String(d.name || ''),
      processorModel: typeof d.processorModel === 'string' ? d.processorModel : null,
      cpuArchitecture: typeof d.cpuArchitecture === 'string' ? d.cpuArchitecture : null,
      cpuCores: typeof d.cpuCores === 'number' ? d.cpuCores : null,
      cpuCoreConfig: typeof d.cpuCoreConfig === 'string' ? d.cpuCoreConfig : null,
      maxClockSpeedGhz:
        typeof d.maxClockSpeedGhz === 'number' ? d.maxClockSpeedGhz : null,
      processNodeNm: typeof d.processNodeNm === 'number' ? d.processNodeNm : null,
      gpuManufacturer: String(d.gpuManufacturer || ''),
      gpuModel: String(d.gpuModel || ''),
      gpuArchitecture: typeof d.gpuArchitecture === 'string' ? d.gpuArchitecture : null,
      gpuClockMhz: typeof d.gpuClockMhz === 'number' ? d.gpuClockMhz : null,
      tier: (d.tier as ChipsetRecord['tier']) || 'Mid-Range',
    };
    chipsetCache.set(chipsetId, record);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchGameCompatibilityForDevice(
  deviceId: string
): Promise<GameCompatibilityRecord[]> {
  if (!deviceId) return [];
  if (compatCache.has(deviceId)) {
    return compatCache.get(deviceId) ?? [];
  }
  const path = 'game_compatibility';
  try {
    const q = query(
      collection(db, 'game_compatibility'),
      where('visibility', '==', 'public'),
      where('deviceId', '==', deviceId)
    );
    const snap = await getDocs(q);
    const items: GameCompatibilityRecord[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      items.push({
        id: String(d.id || docSnap.id),
        visibility: 'public',
        deviceId: String(d.deviceId || deviceId),
        gameKey: d.gameKey as GameCompatibilityRecord['gameKey'],
        supportedFps: Array.isArray(d.supportedFps) ? d.supportedFps.map(Number) : [],
        maxVerifiedFps:
          typeof d.maxVerifiedFps === 'number' ? d.maxVerifiedFps : null,
        graphicsSettings:
          typeof d.graphicsSettings === 'string' ? d.graphicsSettings : null,
        gyroscopeSupport:
          (d.gyroscopeSupport as GameCompatibilityRecord['gyroscopeSupport']) ||
          'unknown',
        compatibilityRegion:
          typeof d.compatibilityRegion === 'string' ? d.compatibilityRegion : null,
        sourceUrl: typeof d.sourceUrl === 'string' ? d.sourceUrl : null,
        verificationStatus:
          d.verificationStatus === 'verified' ? 'verified' : 'unverified',
        lastVerifiedAt:
          typeof d.lastVerifiedAt === 'string' ? d.lastVerifiedAt : null,
      });
    });
    compatCache.set(deviceId, items);
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchDevicesByBrand(
  brandId: string,
  forceRefresh = false
): Promise<DeviceProfile[]> {
  if (!brandId) return [];
  if (!forceRefresh && brandDevicesCache.has(brandId)) {
    return brandDevicesCache.get(brandId) ?? [];
  }
  const path = 'devices';
  try {
    const q = query(
      collection(db, 'devices'),
      where('visibility', '==', 'public'),
      where('brandId', '==', brandId)
    );
    const snap = await getDocs(q);
    const records: SmartphoneDeviceRecord[] = [];
    snap.forEach((docSnap) => {
      records.push(hydrateDeviceDoc(docSnap.data(), docSnap.id));
    });
    // Sort newest-first (2026 -> 2025 -> 2024 -> 2023) client-side so no composite index is needed
    records.sort((a, b) => {
      const dateCmp = b.releaseDate.localeCompare(a.releaseDate);
      if (dateCmp !== 0) return dateCmp;
      return a.model.localeCompare(b.model);
    });
    const profiles = records.map((r) => smartphoneRecordToDeviceProfile(r));
    brandDevicesCache.set(brandId, profiles);
    return profiles;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function enrichDeviceProfile(
  profile: DeviceProfile
): Promise<DeviceProfile> {
  if (!profile.id || profile.id === 'manual-device' || profile.id === 'custom-device') {
    return profile;
  }
  const [compatList, chipset] = await Promise.all([
    fetchGameCompatibilityForDevice(profile.id).catch(() => []),
    profile.chipsetId ? fetchChipsetById(profile.chipsetId).catch(() => null) : Promise.resolve(null),
  ]);

  const compatMap = { ...(profile.gameCompatibility ?? {}) };
  for (const c of compatList) {
    compatMap[c.gameKey] = c;
  }

  const enriched: DeviceProfile = {
    ...profile,
    chipset: chipset ? `${chipset.manufacturer} ${chipset.name}` : profile.chipset,
    gpuModel: chipset?.gpuModel ?? profile.gpuModel,
    gameCompatibility: compatMap,
  };
  return enriched;
}

export async function fetchAllPublicDevices(
  forceRefresh = false,
  maxDocs = 250
): Promise<DeviceProfile[]> {
  if (!forceRefresh && catalogCache) {
    return catalogCache;
  }
  const path = 'devices';
  try {
    const q = query(
      collection(db, 'devices'),
      where('visibility', '==', 'public'),
      limit(maxDocs)
    );
    const snap = await getDocs(q);
    const records: SmartphoneDeviceRecord[] = [];
    snap.forEach((docSnap) => {
      records.push(hydrateDeviceDoc(docSnap.data(), docSnap.id));
    });
    records.sort((a, b) => {
      const dateCmp = b.releaseDate.localeCompare(a.releaseDate);
      if (dateCmp !== 0) return dateCmp;
      return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
    });
    const profiles = records.map((r) => smartphoneRecordToDeviceProfile(r));
    catalogCache = profiles;
    return profiles;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
