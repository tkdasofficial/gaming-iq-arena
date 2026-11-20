/**
 * Free Fire hybrid engine rules. All device measurements here are clearly labelled SYNTHETIC
 * test fixtures — they are not real benchmark or touch data.
 */
import { describe, expect, it } from 'vitest';
import rawConfig from './model-config.v1.json';
import { parseModelConfig, ModelConfigError, SETTING_KEYS, type ModelConfig } from './config';
import { normalize, impairmentToQuality, median } from './normalize';
import { computeIndex } from './indices';
import { buildDeviceIntelligence, shortEdgeMm, type DeviceMeasurements } from './device';
import { buildResponseCurve, computeLosses, selectBest, evaluateCalibration, staleConditions, type CalibrationRun, type CalibrationSession } from './calibration';
import { applyFeedback, applyFeedbackToSet, personalValue } from './feedback';
import { analyzeFreeFire } from './analyze';
import { computeValidationMetrics } from './metrics';
import { EMPTY_PLAYER, sanitizePlayerProfile, type PlayerProfile } from './player';
import { gameRecord } from '../__fixtures__/load';
import { normalizeDevice } from '../recommend';

const cfg: ModelConfig = parseModelConfig(rawConfig);
const NO_DATA: DeviceMeasurements = { benchmarks: [], touchProfiles: [], runtimeProfiles: [] };

// SYNTHETIC catalog-style device (display specs only).
const device = normalizeDevice(
  { id: 'synthetic-phone', brand: 'Test', model: 'Phone', os: 'Android', gyroscopeSupport: 'hardware',
    display: { sizeInches: 6.7, refreshHz: 120, touchSamplingHz: 240, resolution: '2400 x 1080' } },
  null
);
// SYNTHETIC measurements for the "all fields available" cases.
const FULL: DeviceMeasurements = {
  benchmarks: [{ device_id: 'synthetic-phone', chipset_id: null, benchmark_name: 'geekbench-6', single_core_score: 2000, multi_core_score: 6000, gpu_score: null, data_status: 'verified', source: 'synthetic', test_date: '2026-01-01' },
    { device_id: 'synthetic-phone', chipset_id: null, benchmark_name: '3dmark-wild-life-extreme', single_core_score: null, multi_core_score: null, gpu_score: 3000, data_status: 'verified', source: 'synthetic', test_date: '2026-01-01' }],
  touchProfiles: [{ touch_latency_ms: 45, touch_sampling_rate_hz: 240, input_consistency_ms: 4, controller_quality: 7, firmware: null, data_status: 'verified', source: 'synthetic', measured_at: '2026-01-01' }],
  runtimeProfiles: [{ game_version: '1.0', graphics_setting: 'smooth', fps_cap: 90, average_fps: 88, one_percent_low: 80, frame_stability: null, thermal_state: 'light', data_status: 'verified', source: 'synthetic', measurement_date: '2026-01-01' }],
};
const ff = gameRecord('free-fire');

describe('configuration', () => {
  it('accepts the shipped config and rejects weights that do not add up to 1', () => {
    expect(cfg.slider).toEqual({ min: 0, max: 200 });
    const bad = structuredClone(rawConfig) as typeof rawConfig;
    bad.pi.weights.fps = 0.5;
    expect(() => parseModelConfig(bad)).toThrow(ModelConfigError);
  });
  it('uses the brief weights for PI and TDI', () => {
    expect(cfg.pi.weights).toEqual({ fps: 0.25, frameStability: 0.3, gpu: 0.15, cpuSingle: 0.1, cpuMulti: 0.1, thermal: 0.1 });
    expect(cfg.tdi.weights).toEqual({ touchLatency: 0.3, inputConsistency: 0.2, touchSampling: 0.15, touchController: 0.15, screenGeometry: 0.1, refreshRate: 0.1 });
  });
});

describe('normalisation', () => {
  it('maps benchmarks on a log scale and keeps missing as null', () => {
    expect(normalize(400, { type: 'log', worst: 400, best: 3500 })).toBe(0);
    expect(normalize(3500, { type: 'log', worst: 400, best: 3500 })).toBe(10);
    expect(normalize(null, { type: 'log', worst: 400, best: 3500 })).toBeNull();
  });
  it('gives lower latency a better score', () => {
    const n = cfg.tdi.normalization.touchLatency;
    expect(normalize(20, n)).toBe(10);
    expect(normalize(120, n)).toBe(0);
    expect(normalize(30, n)!).toBeGreaterThan(normalize(60, n)!);
  });
  it('converts impairment to quality', () => {
    expect(impairmentToQuality(0)).toBe(10);
    expect(impairmentToQuality(7.5)).toBe(2.5);
    expect(impairmentToQuality(null)).toBeNull();
  });
  it('takes the median of repeated measurements', () => {
    expect(median([10, 100, 12, 11, 13])).toBe(12);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('indices', () => {
  it('computes PI with every field available', () => {
    const d = buildDeviceIntelligence(device, FULL, cfg);
    expect(d.pi.completeness).toBe(1);
    expect(d.pi.incomplete).toBe(false);
    expect(d.pi.score).not.toBeNull();
  });
  it('computes a partial PI from available weights when benchmarks are missing', () => {
    const d = buildDeviceIntelligence(device, { ...FULL, benchmarks: [] }, cfg);
    expect(d.pi.completeness).toBe(0.65);
    expect(d.pi.incomplete).toBe(true);
    // fps 88/90, stability 80/88, thermal light → re-normalised over 0.65 weight
    const fps = normalize(88 / 90, cfg.pi.normalization.fps)!;
    const stab = normalize(80 / 88, cfg.pi.normalization.frameStability)!;
    expect(d.pi.score).toBeCloseTo((0.25 * fps + 0.3 * stab + 0.1 * 7.5) / 0.65, 1);
  });
  it('returns no PI at all when nothing was measured (never zero)', () => {
    const d = buildDeviceIntelligence(device, NO_DATA, cfg);
    expect(d.pi.score).toBeNull();
    expect(d.pi.completeness).toBe(0);
  });
  it('computes TDI with every field and with only advertised specs', () => {
    expect(buildDeviceIntelligence(device, FULL, cfg).tdi.completeness).toBe(1);
    const specsOnly = buildDeviceIntelligence(device, NO_DATA, cfg).tdi;
    expect(specsOnly.completeness).toBe(0.35);
    expect(specsOnly.components.find((c) => c.id === 'touchSampling')?.status).toBe('manufacturer_reported');
    expect(specsOnly.components.find((c) => c.id === 'touchLatency')?.used).toBe(false);
  });
  it('excludes Not Applicable components from completeness and ignores pending ones', () => {
    const r = computeIndex({ a: 0.5, b: 0.5 }, { a: { quality: 8, status: 'verified' }, b: { quality: null, status: 'not_applicable' } }, cfg.statusReliability);
    expect(r).toMatchObject({ score: 8, completeness: 1 });
    const p = computeIndex({ a: 0.5, b: 0.5 }, { a: { quality: 8, status: 'verified' }, b: { quality: 3, status: 'pending' } }, cfg.statusReliability);
    expect(p).toMatchObject({ score: 8, completeness: 0.5 });
  });
  it('marks DPI not applicable on iOS', () => {
    const ios = normalizeDevice({ id: 'x', os: 'iOS', display: { sizeInches: 6.1, refreshHz: 60 } }, null);
    expect(buildDeviceIntelligence(ios, NO_DATA, cfg).dpi.status).toBe('not_applicable');
  });
  it('derives screen geometry from size and resolution', () => {
    expect(shortEdgeMm(6.7, '2400 x 1080')).toBeCloseTo(70, 0);
    expect(shortEdgeMm(6.7, null)).toBeNull();
  });
});

// SYNTHETIC calibration runs: 5 repetitions at each test point; 100 lands closest to target.
const runsAt = (v: number, measured: number[], over = 1): CalibrationRun[] =>
  measured.map((m, i) => ({ sliderValue: v, repetition: i + 1, targetMovement: 100, measuredMovement: m, overshoot: over, undershoot: 1, instability: 2, timeToTargetMs: 600 }));
const goodSession: CalibrationSession = {
  id: 's1',
  createdAt: '2026-01-01T00:00:00Z',
  conditions: { hudLayout: 'default', gameVersion: '1.0' },
  runs: [...runsAt(50, [60, 62, 58, 61, 59]), ...runsAt(100, [99, 101, 100, 98, 140]), ...runsAt(150, [130, 128, 135, 131, 129], 20)],
};

describe('calibration', () => {
  it('stores the response curve with medians per slider value', () => {
    const curve = buildResponseCurve(goodSession.runs);
    expect(curve.map((p) => p.sliderValue)).toEqual([50, 100, 150]);
    expect(curve[1]).toMatchObject({ repetitions: 5, medianMeasured: 100 });
  });
  it('computes the weighted loss and selects the minimum-loss value', () => {
    const curve = buildResponseCurve(goodSession.runs);
    const losses = computeLosses(curve, cfg.settings.general.loss, cfg.calibration.timeReferenceMs);
    const at = (v: number) => losses.find((l) => l.sliderValue === v)!.loss;
    expect(at(100)).toBeLessThan(at(50));
    expect(at(100)).toBeLessThan(at(150));
    expect(selectBest(losses, 120)).toBe(100);
  });
  it('reports insufficient data with fewer than 5 repetitions per point', () => {
    const thin = { ...goodSession, runs: goodSession.runs.filter((r) => r.repetition <= 3) };
    expect(evaluateCalibration([thin], {}, cfg.settings.general, cfg, 120).status).toBe('insufficient_data');
  });
  it('detects stale calibration when HUD or game version changes', () => {
    expect(staleConditions({ hudLayout: 'default' }, { hudLayout: 'custom' }, cfg.calibration.staleWhenChanged)).toEqual(['hudLayout']);
    const r = evaluateCalibration([goodSession], { gameVersion: '1.1' }, cfg.settings.general, cfg, 120);
    expect(r.status).toBe('stale');
    expect(r.staleBecause).toEqual(['gameVersion']);
    expect(evaluateCalibration([goodSession], { gameVersion: '1.0', hudLayout: 'default' }, cfg.settings.general, cfg, 120)).toMatchObject({ status: 'calibrated', best: 100 });
  });
});

describe('feedback', () => {
  it('changes only the setting the feedback is about', () => {
    const values = { general: 150, redDot: 160, scope2x: 140, scope4x: 130, sniper: 90, freeLook: 100 };
    const next = applyFeedbackToSet(values, 'redDot', 'overshooting', cfg);
    expect(next.redDot).toBe(152);
    for (const k of SETTING_KEYS.filter((k) => k !== 'redDot')) expect(next[k]).toBe(values[k]);
  });
  it('keeps the value for comfortable feedback and respects the slider range', () => {
    expect(applyFeedback(120, 'comfortable', 'general', cfg)).toBe(120);
    expect(applyFeedback(198, 'too_slow', 'general', cfg)).toBe(200);
    expect(applyFeedback(3, 'too_fast', 'general', cfg)).toBe(0);
  });
  it('uses the latest personal value per setting', () => {
    const p = personalValue(
      [
        { settingKey: 'sniper', previousValue: 100, newValue: 95, type: 'overshooting', createdAt: '2026-01-01' },
        { settingKey: 'sniper', previousValue: 95, newValue: 95, type: 'accurate', createdAt: '2026-01-02' },
      ],
      'sniper'
    );
    expect(p).toEqual({ value: 95, stable: true });
  });
});

describe('six engines', () => {
  const base = { cfg, game: ff, device, measurements: NO_DATA, player: null, calibration: {}, feedback: [], gameVersion: null };
  it('returns all six settings within 0–200 with low confidence when no player or measured data exists', () => {
    const a = analyzeFreeFire(base);
    expect(a.settings.map((s) => s.key)).toEqual(['general', 'redDot', 'scope2x', 'scope4x', 'sniper', 'freeLook']);
    for (const s of a.settings) {
      expect(s.suggested).toBeGreaterThanOrEqual(0);
      expect(s.suggested).toBeLessThanOrEqual(200);
      expect(s.min).toBeLessThanOrEqual(s.suggested);
      expect(s.max).toBeGreaterThanOrEqual(s.suggested);
      expect(s.confidence).toBe('low');
      expect(s.calibrationStatus).toBe('not_calibrated');
      expect(s.source).toBe('preliminary');
    }
    expect(a.pi.score).toBeNull();
    expect(a.player).toBe('none');
  });
  it('player answers only move the settings that depend on them', () => {
    const player: PlayerProfile = { ...EMPTY_PLAYER, dragTechnique: 'drag-shot' };
    const without = analyzeFreeFire(base).settings;
    const withP = analyzeFreeFire({ ...base, player }).settings;
    const by = (xs: typeof without, k: string) => xs.find((s) => s.key === k)!.suggested;
    expect(by(withP, 'redDot')).toBeGreaterThan(by(without, 'redDot'));
    for (const k of ['general', 'scope2x', 'scope4x', 'sniper', 'freeLook']) expect(by(withP, k)).toBe(by(without, k));
  });
  it('does not force 4X below 2X or Red Dot to an offset from General', () => {
    const a = analyzeFreeFire({ ...base, player: { ...EMPTY_PLAYER, comfortPreference: 'fast', swipeLength: 'short' } });
    const s4 = a.settings.find((s) => s.key === 'scope4x')!;
    expect(s4.factors.every((f) => !f.id.includes('scope2x'))).toBe(true);
  });
  it('uses calibration when available and only then allows high confidence', () => {
    const player: PlayerProfile = sanitizePlayerProfile({ fingerCount: 4, hudLayout: 'default', swipeLength: 'medium', swipeSpeed: 'medium', playStyle: 'balanced', comfortPreference: 'balanced' });
    const a = analyzeFreeFire({ ...base, measurements: FULL, player, calibration: { general: [goodSession] }, gameVersion: '1.0' });
    const g = a.settings.find((s) => s.key === 'general')!;
    expect(g).toMatchObject({ source: 'calibration', calibrationStatus: 'calibrated', suggested: 100, confidence: 'high' });
    expect(a.settings.find((s) => s.key === 'redDot')!.confidence).not.toBe('high');
  });
  it('never raises confidence just because the phone is fast', () => {
    const a = analyzeFreeFire({ ...base, measurements: FULL });
    for (const s of a.settings) expect(s.confidence).not.toBe('high');
  });
  it('marks Free Look as not used when the player says so', () => {
    const a = analyzeFreeFire({ ...base, player: { ...EMPTY_PLAYER, usesFreeLook: false } });
    expect(a.settings.find((s) => s.key === 'freeLook')!.notUsed).toBe(true);
  });
  it('rejects games the calculator is not set up for (Free Fire MAX stays separate)', () => {
    expect(() => analyzeFreeFire({ ...base, game: { ...ff, id: 'free-fire-max' } })).toThrow();
  });
});

describe('player profile validation', () => {
  it('turns invalid answers into unknown instead of guessing', () => {
    expect(sanitizePlayerProfile({ fingerCount: 9, swipeSpeed: 'warp', usesFreeLook: 'yes' })).toEqual(EMPTY_PLAYER);
  });
});

describe('usefulness metrics', () => {
  it('counts a first recommendation within ±10 of the final stable value as useful', () => {
    const recs = [
      { id: 'r1', userId: 'u1', deviceId: 'd1', settingKey: 'general' as const, suggested: 150, confidence: 'low' as const, dataCompleteness: 0.4, createdAt: '2026-01-01' },
      { id: 'r2', userId: 'u2', deviceId: 'd1', settingKey: 'general' as const, suggested: 150, confidence: 'low' as const, dataCompleteness: 0.4, createdAt: '2026-01-01' },
    ];
    const events = [
      { recommendationId: 'r1', previousValue: 150, newValue: 142, type: 'too_fast' as const, createdAt: '2026-01-02' },
      { recommendationId: 'r1', previousValue: 142, newValue: 142, type: 'comfortable' as const, createdAt: '2026-01-03' },
      ...[0, 1, 2, 3].map((i) => ({ recommendationId: 'r2', previousValue: 150 - i * 8, newValue: 142 - i * 8, type: 'too_fast' as const, createdAt: `2026-01-0${i + 2}` })),
      { recommendationId: 'r2', previousValue: 118, newValue: 118, type: 'accurate' as const, createdAt: '2026-01-09' },
    ];
    const m = computeValidationMetrics(recs, events, 0, cfg);
    expect(m.perSetting.general).toMatchObject({ tested: 2, useful: 1, usefulnessPercent: 50 });
    expect(m.failureCases.map((f) => f.recommendationId)).toEqual(['r2']);
    expect(m.perSetting.sniper.usefulnessPercent).toBeNull();
  });
});
