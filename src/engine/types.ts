export type GameId = 'free-fire' | 'pubg-bgmi';

export type CompatGameKey = 'free-fire' | 'free-fire-max' | 'bgmi' | 'pubg-mobile';

export type ClawStyle = '2-finger' | '3-finger' | '4-finger' | '5-finger' | '6-finger';

export type FreeFirePlaystyle =
  | 'aggressive-rush'
  | 'headshot-focus'
  | 'balanced'
  | 'sniper-focus';

export type BgmiPlaystyle =
  | 'aggressive'
  | 'balanced'
  | 'tactical'
  | 'sniper-focus';

export type Playstyle = FreeFirePlaystyle | BgmiPlaystyle;

export type GyroMode = 'off' | 'scope-on' | 'always-on';

export type CameraPref = 'low' | 'medium' | 'high';

export type DeviceOs = 'Android' | 'iOS' | 'HarmonyOS';

export type GyroscopeSupport = 'hardware' | 'software' | 'none' | 'unknown';

export interface BrandRecord {
  id: string;
  visibility: 'public';
  name: string;
  parentCompany: string | null;
  country: string;
  isSubBrand: boolean;
  deviceCount: number;
  latestReleaseYear: number;
}

export interface ChipsetRecord {
  id: string;
  visibility: 'public';
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
  tier: 'Flagship' | 'Esports' | 'Mid-Range' | 'Budget';
}

export interface SmartphoneDisplaySpec {
  sizeInches: number;
  panelType: string | null;
  resolution: string;
  refreshHz: number;
  touchSamplingHz: number | null;
  peakBrightnessNits: number | null;
}

export interface SourceReference {
  title: string;
  url: string;
}

export interface SmartphoneDeviceRecord {
  id: string;
  visibility: 'public';
  deviceType: 'smartphone';
  brandId: string;
  brand: string;
  model: string;
  modelNumber: string | null;
  codename: string | null;
  manufacturer: string;
  os: DeviceOs;
  osVersionLaunch: string | null;
  releaseDate: string;
  releaseYear: number;
  marketAvailability: string | null;
  regionalVariants: string[];
  tier: 'Flagship' | 'Esports' | 'Mid-Range' | 'Budget';
  chipsetId: string;
  chipsetName: string;
  gpuModel: string;
  ramVariantsGb: number[];
  ramType: string | null;
  virtualRamSupport: boolean | null;
  storageVariantsGb: number[];
  storageType: string | null;
  display: SmartphoneDisplaySpec;
  batteryMah: number | null;
  chargingWatt: number | null;
  wirelessChargingWatt: number | null;
  gyroscopeSupport: GyroscopeSupport;
  softwareSupportYears: number | null;
  sources: SourceReference[];
  verificationStatus: 'verified' | 'partial';
  completenessStatus: 'complete' | 'partial';
}

export interface GameCompatibilityRecord {
  id: string;
  visibility: 'public';
  deviceId: string;
  gameKey: CompatGameKey;
  supportedFps: number[];
  maxVerifiedFps: number | null;
  graphicsSettings: string | null;
  gyroscopeSupport: GyroscopeSupport;
  compatibilityRegion: string | null;
  sourceUrl: string | null;
  verificationStatus: 'verified' | 'unverified';
  lastVerifiedAt: string | null;
}

export interface DeviceProfile {
  id: string;
  brand: string;
  model: string;
  os: DeviceOs;
  chipset: string;
  ramGb: number;
  storageGb: number;
  screenInches: number;
  resolution: string;
  refreshHz: number;
  touchSamplingHz: number | null;
  supportedFpsByGame: {
    'free-fire': string[];
    'pubg-bgmi': string[];
  };
  tier: 'Flagship' | 'Esports' | 'Mid-Range' | 'Budget' | 'Tablet';
  brandId?: string;
  modelNumber?: string | null;
  chipsetId?: string;
  gpuModel?: string;
  ramVariantsGb?: number[];
  ramType?: string | null;
  storageVariantsGb?: number[];
  storageType?: string | null;
  panelType?: string | null;
  peakBrightnessNits?: number | null;
  releaseDate?: string;
  releaseYear?: number;
  osVersionLaunch?: string | null;
  batteryMah?: number | null;
  chargingWatt?: number | null;
  wirelessChargingWatt?: number | null;
  gyroscopeSupport?: GyroscopeSupport;
  softwareSupportYears?: number | null;
  sources?: SourceReference[];
  verificationStatus?: 'verified' | 'partial';
  completenessStatus?: 'complete' | 'partial';
  gameCompatibility?: Partial<Record<CompatGameKey, GameCompatibilityRecord>>;
}

export interface CalibrationInput {
  game: GameId;
  device: DeviceProfile;
  claw: ClawStyle;
  playstyle: Playstyle;
  gyro: GyroMode;
  preferredFps: string;
  fireButtonSize?: number;
  dpiOverride?: string;
  cameraPref?: CameraPref;
  currentSensitivity?: string;
}

export interface SensitivitySliderItem {
  key: string;
  label: string;
  category: 'general' | 'free-look' | 'camera' | 'ads' | 'gyro' | 'ads-gyro';
  value: number;
  min: number;
  max: number;
  unit: string;
}

export interface HardwareTips {
  fireButtonSize?: string;
  recommendedDpi: string;
  graphicsPreset: string;
  frameRateTarget: string;
}

export interface CalibrationResult {
  game: GameId;
  gameLabel: string;
  scaleMax: number;
  sliders: SensitivitySliderItem[];
  hardwareTips: HardwareTips;
  shareCode: string;
  summaryText: string;
}

export interface ProPreset {
  id: string;
  authorId: string;
  authorName: string;
  name: string;
  playerArchetype: string;
  game: GameId;
  claw: ClawStyle;
  playstyle: Playstyle;
  gyro: GyroMode;
  device: DeviceProfile;
  headlineMetric: string;
  description: string;
  sliderOverrides?: Record<string, number>;
  createdAt: string;
}

export interface SavedSetup {
  id: string;
  name: string;
  createdAt: string;
  input: CalibrationInput;
  sliders: Record<string, number>;
}

export interface AimLabRun {
  id: string;
  ownerId: string;
  game: GameId;
  hits: number;
  misses: number;
  accuracy: number;
  avgReactionMs?: number;
  bestStreak: number;
  scalar: number;
  createdAt: string;
}
