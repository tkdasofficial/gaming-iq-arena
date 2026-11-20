/**
 * Device intelligence: turns catalog specs and measured rows into PI / TDI component inputs.
 * Specs (what the maker advertises) are kept apart from measurements (what was tested).
 * Advertised values are tagged `manufacturer_reported`; nothing is estimated here.
 */
import type { ModelConfig, PiKey, TdiKey } from './config';
import { computeIndex, isUsable, missing, type ComponentInput, type DataStatus, type IndexResult } from './indices';
import { impairmentToQuality, normalize, round1 } from './normalize';
import type { VerifiedDevice } from '../recommend';

export interface BenchmarkRow {
  device_id: string | null;
  chipset_id: string | null;
  benchmark_name: string;
  single_core_score: number | null;
  multi_core_score: number | null;
  gpu_score: number | null;
  data_status: DataStatus;
  source: string;
  test_date: string | null;
}

export interface TouchProfileRow {
  touch_latency_ms: number | null;
  touch_sampling_rate_hz: number | null;
  input_consistency_ms: number | null;
  controller_quality: number | null;
  firmware: string | null;
  data_status: DataStatus;
  source: string;
  measured_at: string | null;
}

export interface RuntimeProfileRow {
  game_version: string | null;
  graphics_setting: string | null;
  fps_cap: number | null;
  average_fps: number | null;
  one_percent_low: number | null;
  frame_stability: number | null;
  thermal_state: string | null;
  data_status: DataStatus;
  source: string;
  measurement_date: string | null;
}

export interface DeviceMeasurements {
  benchmarks: BenchmarkRow[];
  touchProfiles: TouchProfileRow[];
  runtimeProfiles: RuntimeProfileRow[];
}

export interface DeviceIntelligence {
  pi: IndexResult;
  tdi: IndexResult;
  inputs: Record<PiKey | TdiKey, ComponentInput>;
  runtime: { fpsCap: number | null; graphicsSetting: string | null; gameVersion: string | null };
  refreshRateHz: number | null;
  /** DPI is not latency; it is Not Applicable on iOS and unused elsewhere unless measured. */
  dpi: { status: DataStatus };
}

const RANK: Record<DataStatus, number> = {
  verified: 4,
  manufacturer_reported: 3,
  user_reported: 2,
  estimated: 1,
  pending: 0,
  not_verified: 0,
  not_applicable: 0,
};
const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

/** Most trustworthy usable row first, newest as tie-break. */
function best<T extends { data_status: DataStatus }>(rows: T[], date: (r: T) => string | null, has: (r: T) => boolean): T | null {
  return (
    rows
      .filter((r) => isUsable(r.data_status) && has(r))
      .sort((a, b) => RANK[b.data_status] - RANK[a.data_status] || String(date(b) ?? '').localeCompare(String(date(a) ?? '')))[0] ?? null
  );
}

/** Short screen edge in mm (landscape swipe room) from diagonal + resolution aspect ratio. */
export function shortEdgeMm(sizeInches: number | null, resolution: string | null): number | null {
  if (!sizeInches || !resolution) return null;
  const m = resolution.match(/(\d{3,5})\s*[x×]\s*(\d{3,5})/i);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const aspect = Math.max(a, b) / Math.min(a, b);
  return round1((sizeInches / Math.sqrt(1 + aspect * aspect)) * 25.4);
}

export function buildDeviceIntelligence(device: VerifiedDevice, m: DeviceMeasurements, cfg: ModelConfig): DeviceIntelligence {
  const n = cfg.tdi.normalization;
  const inputs = {} as Record<PiKey | TdiKey, ComponentInput>;

  // ---- runtime (measured in-game) ----
  const rt = best(m.runtimeProfiles, (r) => r.measurement_date, (r) => num(r.average_fps) !== null || num(r.frame_stability) !== null || r.thermal_state !== null);
  if (rt) {
    const avg = num(rt.average_fps);
    const cap = num(rt.fps_cap);
    const low = num(rt.one_percent_low);
    inputs.fps = avg !== null && cap !== null
      ? { quality: normalize(avg / cap, cfg.pi.normalization.fps), status: rt.data_status, raw: avg, unit: `FPS of ${cap}`, source: rt.source }
      : missing();
    const stored = num(rt.frame_stability);
    inputs.frameStability = stored !== null
      ? { quality: stored, status: rt.data_status, raw: stored, unit: '0–10', source: rt.source }
      : avg !== null && low !== null
        ? { quality: normalize(low / avg, cfg.pi.normalization.frameStability), status: rt.data_status, raw: low, unit: '1% low FPS', source: rt.source }
        : missing();
    const imp = rt.thermal_state ? cfg.pi.thermalImpairment[rt.thermal_state] : undefined;
    inputs.thermal = imp !== undefined
      ? { quality: impairmentToQuality(imp), status: rt.data_status, raw: rt.thermal_state, source: rt.source }
      : missing();
  } else {
    inputs.fps = missing('pending');
    inputs.frameStability = missing('pending');
    inputs.thermal = missing('pending');
  }

  // ---- benchmarks (device-specific rows win over chipset-wide rows) ----
  const benchFor = (field: 'single_core_score' | 'multi_core_score' | 'gpu_score', key: 'cpuSingle' | 'cpuMulti' | 'gpu'): ComponentInput => {
    const rows = m.benchmarks.filter((b) => cfg.pi.benchmarks[b.benchmark_name]?.[key] && num(b[field]) !== null);
    const pick = best(rows.filter((r) => r.device_id), (r) => r.test_date, () => true) ?? best(rows.filter((r) => r.chipset_id), (r) => r.test_date, () => true);
    if (!pick) return missing('pending');
    const norm = cfg.pi.benchmarks[pick.benchmark_name]?.[key];
    return { quality: norm ? normalize(num(pick[field]), norm) : null, status: pick.data_status, raw: num(pick[field]), unit: pick.benchmark_name, source: pick.source };
  };
  inputs.cpuSingle = benchFor('single_core_score', 'cpuSingle');
  inputs.cpuMulti = benchFor('multi_core_score', 'cpuMulti');
  inputs.gpu = benchFor('gpu_score', 'gpu');

  // ---- touch (measured) ----
  const tp = (pick: (r: TouchProfileRow) => number | null) => best(m.touchProfiles, (r) => r.measured_at, (r) => pick(r) !== null);
  const lat = tp((r) => num(r.touch_latency_ms));
  inputs.touchLatency = lat
    ? { quality: normalize(num(lat.touch_latency_ms), n.touchLatency), status: lat.data_status, raw: num(lat.touch_latency_ms), unit: 'ms', source: lat.source }
    : missing('pending');
  const cons = tp((r) => num(r.input_consistency_ms));
  inputs.inputConsistency = cons
    ? { quality: normalize(num(cons.input_consistency_ms), n.inputConsistency), status: cons.data_status, raw: num(cons.input_consistency_ms), unit: 'ms SD', source: cons.source }
    : missing('pending');
  const ctl = tp((r) => num(r.controller_quality));
  inputs.touchController = ctl
    ? { quality: normalize(num(ctl.controller_quality), n.touchController), status: ctl.data_status, raw: num(ctl.controller_quality), source: ctl.source }
    : missing('pending');
  // Sampling: a measured value wins; otherwise the advertised spec (manufacturer reported).
  const samp = tp((r) => num(r.touch_sampling_rate_hz));
  const specSampling = device.display.touchSamplingHz;
  inputs.touchSampling = samp
    ? { quality: normalize(num(samp.touch_sampling_rate_hz), n.touchSampling), status: samp.data_status, raw: num(samp.touch_sampling_rate_hz), unit: 'Hz', source: samp.source }
    : specSampling !== null
      ? { quality: normalize(specSampling, n.touchSampling), status: 'manufacturer_reported', raw: specSampling, unit: 'Hz (advertised)', source: 'Phone catalog' }
      : missing();

  // ---- display (specs) ----
  const edge = shortEdgeMm(device.display.sizeInches, device.display.resolution);
  inputs.screenGeometry = edge !== null
    ? { quality: normalize(edge, n.screenGeometry), status: 'manufacturer_reported', raw: edge, unit: 'mm short edge', source: 'Phone catalog' }
    : missing();
  const hz = device.display.refreshHz;
  inputs.refreshRate = hz !== null
    ? { quality: normalize(hz, n.refreshRate), status: 'manufacturer_reported', raw: hz, unit: 'Hz', source: 'Phone catalog' }
    : missing();

  const pi = computeIndex(cfg.pi.weights, inputs, cfg.statusReliability);
  const tdi = computeIndex(cfg.tdi.weights, inputs, cfg.statusReliability);
  return {
    pi,
    tdi,
    inputs,
    runtime: { fpsCap: rt ? num(rt.fps_cap) : null, graphicsSetting: rt?.graphics_setting ?? null, gameVersion: rt?.game_version ?? null },
    refreshRateHz: hz,
    dpi: { status: device.os === 'iOS' ? 'not_applicable' : 'not_verified' },
  };
}
