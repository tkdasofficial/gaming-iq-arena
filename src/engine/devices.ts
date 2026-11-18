import type {
  ChipsetRecord,
  CompatGameKey,
  DeviceProfile,
  GameCompatibilityRecord,
  GameId,
  SmartphoneDeviceRecord,
} from './types';

export function createBlankDeviceProfile(): DeviceProfile {
  return {
    id: 'manual-device',
    brand: '',
    model: '',
    os: 'Android',
    chipset: '',
    ramGb: 8,
    storageGb: 128,
    screenInches: 6.7,
    resolution: '',
    refreshHz: 120,
    touchSamplingHz: null,
    supportedFpsByGame: {
      'free-fire': ['30 FPS', '60 FPS'],
      'pubg-bgmi': ['30 FPS (High)', '40 FPS (Ultra)', '60 FPS (Extreme)'],
    },
    tier: 'Mid-Range',
    gyroscopeSupport: 'unknown',
  };
}

export function formatDeviceFullName(brand: string, model: string): string {
  const cleanBrand = brand.trim();
  const cleanModel = model.trim();
  if (!cleanBrand) return cleanModel;
  if (!cleanModel) return cleanBrand;
  if (cleanModel.toLowerCase().startsWith(cleanBrand.toLowerCase())) {
    return cleanModel;
  }
  if (cleanBrand === 'Google Pixel' && cleanModel.startsWith('Pixel')) {
    return `Google ${cleanModel}`;
  }
  return `${cleanBrand} ${cleanModel}`;
}

export function calculateDeviceAge(
  releaseDate?: string | null,
  referenceDate: Date = new Date()
): string | null {
  if (!releaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return null;
  }
  const [y, m, d] = releaseDate.split('-').map(Number);
  const releasedUtc = Date.UTC(y, m - 1, d);
  if (Number.isNaN(releasedUtc)) return null;

  const refUtc = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  );

  if (releasedUtc > refUtc) {
    const futureMonths = Math.max(
      1,
      (y - referenceDate.getUTCFullYear()) * 12 + (m - 1 - referenceDate.getUTCMonth())
    );
    return futureMonths <= 1 ? 'Upcoming release' : `Upcoming (~${futureMonths} mos)`;
  }

  let totalMonths =
    (referenceDate.getUTCFullYear() - y) * 12 + (referenceDate.getUTCMonth() - (m - 1));
  if (referenceDate.getUTCDate() < d) {
    totalMonths -= 1;
  }
  totalMonths = Math.max(0, totalMonths);

  if (totalMonths < 1) {
    return '< 1 mo old';
  }
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) {
    return `${months} ${months === 1 ? 'mo' : 'mos'} old`;
  }
  if (months === 0) {
    return `${years} ${years === 1 ? 'yr' : 'yrs'} old`;
  }
  return `${years} ${years === 1 ? 'yr' : 'yrs'} ${months} ${months === 1 ? 'mo' : 'mos'} old`;
}

function formatBgmiFpsLabel(fps: number): string {
  if (fps === 30) return '30 FPS (High)';
  if (fps === 40) return '40 FPS (Ultra)';
  if (fps === 60) return '60 FPS (Extreme)';
  if (fps === 90) return '90 FPS';
  if (fps === 120) return '120 FPS (Ultra Extreme)';
  return `${fps} FPS`;
}

export interface GameCompatibilitySummary {
  isVerified: boolean;
  maxVerifiedFps: number | null;
  statusLabel: string;
  graphicsSettings: string | null;
  options: string[];
}

export function getGameCompatibilitySummary(
  device: DeviceProfile,
  game: GameId
): GameCompatibilitySummary {
  const compatKey: CompatGameKey = game === 'free-fire' ? 'free-fire' : 'bgmi';
  const compat = device.gameCompatibility?.[compatKey];

  if (
    compat &&
    compat.verificationStatus === 'verified' &&
    compat.supportedFps.length > 0
  ) {
    const options =
      game === 'free-fire'
        ? compat.supportedFps.map((f) => `${f} FPS`)
        : compat.supportedFps.map(formatBgmiFpsLabel);

    return {
      isVerified: true,
      maxVerifiedFps: compat.maxVerifiedFps,
      statusLabel: compat.maxVerifiedFps
        ? `Verified up to ${compat.maxVerifiedFps} FPS`
        : 'Verified',
      graphicsSettings: compat.graphicsSettings,
      options,
    };
  }

  // Fallback target selector when official game-specific FPS confirmation is absent.
  // Never claim unverified devices are officially verified for 120 FPS.
  const fallbackOptions =
    game === 'free-fire'
      ? device.refreshHz >= 90
        ? ['30 FPS', '60 FPS', '90 FPS']
        : ['30 FPS', '60 FPS']
      : device.refreshHz >= 90
        ? ['40 FPS (Ultra)', '60 FPS (Extreme)', '90 FPS']
        : ['30 FPS (High)', '40 FPS (Ultra)', '60 FPS (Extreme)'];

  return {
    isVerified: false,
    maxVerifiedFps: null,
    statusLabel: 'Unverified in official game list',
    graphicsSettings: null,
    options: fallbackOptions,
  };
}

export function getSupportedFpsOptions(
  device: DeviceProfile,
  game: GameId
): string[] {
  return getGameCompatibilitySummary(device, game).options;
}

export function smartphoneRecordToDeviceProfile(
  record: SmartphoneDeviceRecord,
  compatRecords?: GameCompatibilityRecord[],
  chipset?: ChipsetRecord | null
): DeviceProfile {
  const compatMap: Partial<Record<CompatGameKey, GameCompatibilityRecord>> = {};
  if (compatRecords) {
    for (const c of compatRecords) {
      compatMap[c.gameKey] = c;
    }
  }

  const defaultRam = record.ramVariantsGb[0] ?? 8;
  const defaultStorage = record.storageVariantsGb[0] ?? 128;

  const baseProfile: DeviceProfile = {
    id: record.id,
    brandId: record.brandId,
    brand: record.brand,
    model: record.model,
    modelNumber: record.modelNumber,
    os: record.os,
    osVersionLaunch: record.osVersionLaunch,
    chipsetId: record.chipsetId,
    chipset: chipset ? `${chipset.manufacturer} ${chipset.name}` : record.chipsetName,
    gpuModel: chipset?.gpuModel ?? record.gpuModel,
    ramGb: defaultRam,
    ramVariantsGb: record.ramVariantsGb,
    ramType: record.ramType,
    storageGb: defaultStorage,
    storageVariantsGb: record.storageVariantsGb,
    storageType: record.storageType,
    screenInches: record.display.sizeInches,
    resolution: record.display.resolution,
    refreshHz: record.display.refreshHz,
    touchSamplingHz: record.display.touchSamplingHz,
    panelType: record.display.panelType,
    peakBrightnessNits: record.display.peakBrightnessNits,
    releaseDate: record.releaseDate,
    releaseYear: record.releaseYear,
    batteryMah: record.batteryMah,
    chargingWatt: record.chargingWatt,
    wirelessChargingWatt: record.wirelessChargingWatt,
    gyroscopeSupport: record.gyroscopeSupport,
    softwareSupportYears: record.softwareSupportYears,
    sources: record.sources,
    verificationStatus: record.verificationStatus,
    completenessStatus: record.completenessStatus,
    gameCompatibility: compatMap,
    supportedFpsByGame: {
      'free-fire': [],
      'pubg-bgmi': [],
    },
    tier: record.tier,
  };

  baseProfile.supportedFpsByGame = {
    'free-fire': getSupportedFpsOptions(baseProfile, 'free-fire'),
    'pubg-bgmi': getSupportedFpsOptions(baseProfile, 'pubg-bgmi'),
  };

  return baseProfile;
}

export function searchDevices(devices: DeviceProfile[], query: string): DeviceProfile[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return devices;
  return devices.filter((d) => {
    const haystack = `${d.brand} ${d.model} ${d.modelNumber ?? ''} ${d.os} ${d.chipset} ${d.gpuModel ?? ''} ${d.tier} ${d.releaseYear ?? ''}`.toLowerCase();
    return haystack.includes(normalized);
  });
}
