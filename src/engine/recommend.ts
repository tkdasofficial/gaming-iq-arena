/**
 * Gaming IQ recommendation engine (pure, runs on the server).
 * Inputs are a verified device record from the catalog and a game record whose
 * `config` (stored in the database) defines that game's settings and base values.
 * Missing hardware values stay null — they are never estimated.
 */

export type GyroSupport = 'hardware' | 'software' | 'none' | 'unknown';
export type CoreSettingId = 'general' | 'redDot' | 'scope2x' | 'scope4x' | 'sniper' | 'freeLook';
export type GameExtra = 'fireButton' | 'gyroMode';

export interface VerifiedDevice {
  id: string;
  brandId: string;
  brand: string;
  model: string;
  fullName: string;
  modelNumber: string | null;
  os: string | null;
  osVersion: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  chipset: string | null;
  cpu: string | null;
  gpu: string | null;
  processNm: number | null;
  ramGb: number[];
  ramType: string | null;
  storageGb: number[];
  storageType: string | null;
  display: {
    sizeInches: number | null;
    panelType: string | null;
    resolution: string | null;
    refreshHz: number | null;
    touchSamplingHz: number | null;
  };
  batteryMah: number | null;
  gyroscope: GyroSupport;
  verification: 'verified' | 'partial';
  sources: { title: string; url: string }[];
}

export interface GameSettingConfig {
  key: string;
  label: string;
  group: string;
  base: number;
  min: number;
  max: number;
  factor: 'touch' | 'gyro';
  core?: CoreSettingId;
  /** One plain sentence on what the slider controls in game. */
  description?: string;
}

/** A fixed recommended choice for a non-slider option (e.g. a preset or toggle). */
export interface GameOptionConfig {
  label: string;
  value: string;
  note: string;
  requiresGyro?: boolean;
}

export interface GameConfig {
  scaleMax: number;
  unit: string;
  groups: { id: string; label: string; description?: string; requiresGyro?: boolean }[];
  settings: GameSettingConfig[];
  extras: GameExtra[];
  options?: GameOptionConfig[];
}

export interface GameRecord {
  id: string;
  name: string;
  shortName: string;
  publisher: string;
  supportsGyro: boolean;
  config: GameConfig;
}

export interface RecommendedSetting {
  key: string;
  label: string;
  value: number;
  max: number;
  description?: string;
}

export interface Recommendation {
  gameId: string;
  gameName: string;
  gameShortName: string;
  device: VerifiedDevice;
  unit: string;
  scaleMax: number;
  core: { id: CoreSettingId; label: string; value: number; source: string }[];
  groups: { id: string; label: string; description?: string; settings: RecommendedSetting[] }[];
  gyro: 'included' | 'not-verified' | 'not-supported' | 'software-only' | 'game-unsupported';
  extras: { label: string; value: string; note: string }[];
  basis: string[];
  generatedAt: string;
}

export const CORE_LABELS: Record<CoreSettingId, string> = {
  general: 'General',
  redDot: 'Red Dot',
  scope2x: '2x Scope',
  scope4x: '4x Scope',
  sniper: 'Sniper Scope',
  freeLook: 'Free Look',
};
const CORE_ORDER: CoreSettingId[] = ['general', 'redDot', 'scope2x', 'scope4x', 'sniper', 'freeLook'];

export class RecommendationError extends Error {}

// ---------- normalisation (strict: unknown stays null) ----------

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
const nums = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x): x is number => num(x) !== null) : []);

export function formatDeviceFullName(brand: string, model: string): string {
  const b = brand.trim();
  const m = model.trim();
  if (!b) return m;
  if (!m) return b;
  return m.toLowerCase().startsWith(b.toLowerCase()) ? m : `${b} ${m}`;
}

export function normalizeDevice(
  raw: Record<string, unknown>,
  chipset: Record<string, unknown> | null
): VerifiedDevice {
  const display = (raw.display ?? {}) as Record<string, unknown>;
  const brand = str(raw.brand) ?? '';
  const model = str(raw.model) ?? '';
  const gyro = raw.gyroscopeSupport;
  const chipName = chipset ? [str(chipset.manufacturer), str(chipset.name)].filter(Boolean).join(' ') : null;
  return {
    id: String(raw.id ?? ''),
    brandId: String(raw.brandId ?? ''),
    brand,
    model,
    fullName: formatDeviceFullName(brand, model),
    modelNumber: str(raw.modelNumber),
    os: str(raw.os),
    osVersion: str(raw.osVersionLaunch),
    releaseDate: str(raw.releaseDate),
    releaseYear: num(raw.releaseYear),
    chipset: chipName || str(raw.chipsetName),
    cpu: chipset ? str(chipset.cpuCoreConfig) : null,
    gpu: (chipset ? str(chipset.gpuModel) : null) ?? str(raw.gpuModel),
    processNm: chipset ? num(chipset.processNodeNm) : null,
    ramGb: nums(raw.ramVariantsGb),
    ramType: str(raw.ramType),
    storageGb: nums(raw.storageVariantsGb),
    storageType: str(raw.storageType),
    display: {
      sizeInches: num(display.sizeInches),
      panelType: str(display.panelType),
      resolution: str(display.resolution),
      refreshHz: num(display.refreshHz),
      touchSamplingHz: num(display.touchSamplingHz),
    },
    batteryMah: num(raw.batteryMah),
    gyroscope: gyro === 'hardware' || gyro === 'software' || gyro === 'none' ? gyro : 'unknown',
    verification: raw.verificationStatus === 'verified' ? 'verified' : 'partial',
    sources: Array.isArray(raw.sources)
      ? (raw.sources as { title?: unknown; url?: unknown }[])
          .filter((s) => str(s?.url))
          .map((s) => ({ title: str(s.title) ?? 'Source', url: String(s.url) }))
      : [],
  };
}

/** A device can be used only when the display values the engine relies on are known. */
export function deviceSupportIssue(device: VerifiedDevice): string | null {
  if (device.display.sizeInches === null || device.display.refreshHz === null) {
    return 'This phone is missing verified display data, so settings can’t be generated for it yet.';
  }
  return null;
}

// ---------- device factors ----------

export function screenFactor(inches: number): number {
  if (inches >= 9.5) return 0.86;
  if (inches >= 8) return 0.91;
  if (inches >= 7.2) return 0.95;
  if (inches <= 6.2) return 1.03;
  if (inches <= 6.6) return 1.01;
  return 1;
}

export function refreshFactor(hz: number): number {
  if (hz >= 165) return 0.95;
  if (hz >= 144) return 0.96;
  if (hz >= 120) return 0.98;
  if (hz >= 90) return 1.01;
  return 1.04;
}

export function touchFactor(hz: number | null): number {
  if (hz === null) return 1;
  if (hz >= 480) return 0.98;
  if (hz >= 300) return 0.99;
  if (hz <= 180) return 1.03;
  return 1;
}

function gyroScreenFactor(inches: number, os: string | null): number {
  if (inches >= 9) return 0.8;
  if (inches >= 7.2) return 0.9;
  return os === 'iOS' ? 0.98 : 1.02;
}

export function fireButtonSize(inches: number): number {
  if (inches <= 6.3) return 44;
  if (inches <= 6.7) return 46;
  if (inches < 7.2) return 48;
  return 52;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)));

// ---------- engine ----------

export function buildRecommendation(device: VerifiedDevice, game: GameRecord, now = new Date()): Recommendation {
  const issue = deviceSupportIssue(device);
  if (issue) throw new RecommendationError(issue);
  const cfg = game.config;
  if (!cfg || !Array.isArray(cfg.settings) || cfg.settings.length === 0) {
    throw new RecommendationError(`${game.name} has no sensitivity configuration yet.`);
  }

  const size = device.display.sizeInches as number;
  const hz = device.display.refreshHz as number;
  const touch = screenFactor(size) * refreshFactor(hz) * touchFactor(device.display.touchSamplingHz);
  const gyroScale = gyroScreenFactor(size, device.os) * refreshFactor(hz);

  const gyro: Recommendation['gyro'] = !game.supportsGyro
    ? 'game-unsupported'
    : device.gyroscope === 'hardware'
      ? 'included'
      : device.gyroscope === 'software'
        ? 'software-only'
        : device.gyroscope === 'none'
          ? 'not-supported'
          : 'not-verified';

  const groupLabel = new Map(cfg.groups.map((g) => [g.id, g.label]));
  const values = new Map<string, number>();
  for (const s of cfg.settings) {
    const factor = s.factor === 'gyro' ? gyroScale : touch;
    values.set(s.key, clamp(s.base * factor, s.min, s.max));
  }

  const groups = cfg.groups
    .filter((g) => !g.requiresGyro || gyro === 'included')
    .map((g) => ({
      id: g.id,
      label: g.label,
      ...(g.description ? { description: g.description } : {}),
      settings: cfg.settings
        .filter((s) => s.group === g.id)
        .map((s) => ({
          key: s.key,
          label: s.label,
          value: values.get(s.key) as number,
          max: s.max,
          ...(s.description ? { description: s.description } : {}),
        })),
    }))
    .filter((g) => g.settings.length > 0);

  const core = CORE_ORDER.flatMap((id) => {
    const s = cfg.settings.find((x) => x.core === id);
    if (!s) return [];
    const group = groupLabel.get(s.group) ?? '';
    const source = s.label === CORE_LABELS[id] ? group : `${group} · ${s.label}`;
    return [{ id, label: CORE_LABELS[id], value: values.get(s.key) as number, source }];
  });

  const extras: Recommendation['extras'] = [];
  for (const extra of cfg.extras ?? []) {
    if (extra === 'fireButton') {
      extras.push({ label: 'Fire button size', value: `${fireButtonSize(size)}%`, note: `Based on the ${size}" display` });
    }
    if (extra === 'gyroMode') {
      extras.push(
        gyro === 'included'
          ? {
              label: 'Gyroscope',
              value: 'Always On',
              note: 'Choices are Off, Scope On and Always On. The gyroscope values above are set for Always On; pick Scope On if you only want to tilt while aiming.',
            }
          : gyro === 'not-verified'
            ? { label: 'Gyroscope', value: 'Off', note: 'This phone’s gyroscope isn’t verified, so tilt aiming isn’t recommended.' }
            : gyro === 'software-only'
              ? { label: 'Gyroscope', value: 'Off', note: 'Only a software gyroscope is listed' }
              : { label: 'Gyroscope', value: 'Off', note: 'No gyroscope on this phone' }
      );
    }
  }

  for (const o of cfg.options ?? []) {
    if (o.requiresGyro && gyro !== 'included') continue;
    extras.push({ label: o.label, value: o.value, note: o.note });
  }

  const basis = [
    `${size}" display`,
    `${hz} Hz refresh rate`,
    device.display.touchSamplingHz ? `${device.display.touchSamplingHz} Hz touch sampling` : 'Touch sampling not verified (neutral)',
  ];

  return {
    gameId: game.id,
    gameName: game.name,
    gameShortName: game.shortName,
    device,
    unit: cfg.unit ?? '',
    scaleMax: cfg.scaleMax,
    core,
    groups,
    gyro,
    extras,
    basis,
    generatedAt: now.toISOString(),
  };
}

export function formatRecommendationText(rec: Recommendation): string {
  const u = rec.unit;
  const lines = [`Gaming IQ · ${rec.gameName}`, `Device: ${rec.device.fullName}`, ''];
  if (rec.groups.length === 1) {
    for (const s of rec.groups[0].settings) lines.push(`${s.label}: ${s.value}${u}`);
  } else {
    for (const g of rec.groups) {
      lines.push(`[${g.label}]`);
      for (const s of g.settings) lines.push(`${s.label}: ${s.value}${u}`);
      lines.push('');
    }
  }
  if (rec.extras.length) {
    if (lines[lines.length - 1] !== '') lines.push('');
    for (const e of rec.extras) lines.push(`${e.label}: ${e.value}`);
  }
  return lines.join('\n').trim();
}
