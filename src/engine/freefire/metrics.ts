/**
 * Real-world usefulness tracking. A first recommendation is useful when its suggested value is
 * within ±tolerance of the player's final stable value, or the player reached a stable value with
 * no more than `maxSmallCorrections` corrections of at most `smallCorrectionMax` points each.
 * Only recommendations whose player has marked a stable value count as tested.
 */
import { SETTING_KEYS, type Confidence, type ModelConfig, type SettingKey } from './config';
import { STABLE_FEEDBACK, type FeedbackType } from './feedback';
import { round2 } from './normalize';

export interface MetricRecommendation {
  id: string;
  userId: string;
  deviceId: string;
  settingKey: SettingKey;
  suggested: number;
  confidence: Confidence;
  dataCompleteness: number;
  createdAt: string;
}

export interface MetricFeedback {
  recommendationId: string;
  previousValue: number;
  newValue: number;
  type: FeedbackType;
  createdAt: string;
}

export interface SettingMetrics {
  tested: number;
  useful: number;
  usefulnessPercent: number | null;
  avgCorrections: number | null;
  avgDistanceFromFinal: number | null;
}

export interface ValidationMetrics {
  perSetting: Record<SettingKey, SettingMetrics>;
  testedUsers: number;
  testedDevices: number;
  calibrationSessions: number;
  totalRecommendations: number;
  confidenceDistribution: Record<Confidence, number>;
  missingDataRate: number | null;
  failureCases: { recommendationId: string; settingKey: SettingKey; suggested: number; finalValue: number; corrections: number }[];
}

export function evaluateFirstRecommendation(rec: MetricRecommendation, events: MetricFeedback[], cfg: ModelConfig) {
  const sorted = events.filter((e) => e.recommendationId === rec.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const stableIdx = sorted.findIndex((e) => STABLE_FEEDBACK.includes(e.type));
  if (stableIdx < 0) return null;
  const finalValue = (sorted[stableIdx] as MetricFeedback).newValue;
  const corrections = sorted.slice(0, stableIdx).filter((e) => e.newValue !== e.previousValue);
  const distance = Math.abs(rec.suggested - finalValue);
  const u = cfg.usefulness;
  const useful =
    distance <= u.tolerance ||
    (corrections.length <= u.maxSmallCorrections && corrections.every((e) => Math.abs(e.newValue - e.previousValue) <= u.smallCorrectionMax));
  return { useful, finalValue, corrections: corrections.length, distance };
}

export function computeValidationMetrics(
  recs: MetricRecommendation[],
  events: MetricFeedback[],
  calibrationSessions: number,
  cfg: ModelConfig
): ValidationMetrics {
  // First recommendation per player + phone + setting.
  const first = new Map<string, MetricRecommendation>();
  for (const r of [...recs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const k = `${r.userId}|${r.deviceId}|${r.settingKey}`;
    if (!first.has(k)) first.set(k, r);
  }
  const perSetting = {} as Record<SettingKey, SettingMetrics>;
  const acc = Object.fromEntries(SETTING_KEYS.map((k) => [k, { tested: 0, useful: 0, corr: 0, dist: 0 }])) as Record<SettingKey, { tested: number; useful: number; corr: number; dist: number }>;
  const failureCases: ValidationMetrics['failureCases'] = [];
  const users = new Set<string>();
  const devices = new Set<string>();
  for (const r of first.values()) {
    const res = evaluateFirstRecommendation(r, events, cfg);
    if (!res) continue;
    users.add(r.userId);
    devices.add(r.deviceId);
    const a = acc[r.settingKey];
    a.tested += 1;
    a.corr += res.corrections;
    a.dist += res.distance;
    if (res.useful) a.useful += 1;
    else failureCases.push({ recommendationId: r.id, settingKey: r.settingKey, suggested: r.suggested, finalValue: res.finalValue, corrections: res.corrections });
  }
  for (const k of SETTING_KEYS) {
    const a = acc[k];
    perSetting[k] = {
      tested: a.tested,
      useful: a.useful,
      usefulnessPercent: a.tested ? round2((a.useful / a.tested) * 100) : null,
      avgCorrections: a.tested ? round2(a.corr / a.tested) : null,
      avgDistanceFromFinal: a.tested ? round2(a.dist / a.tested) : null,
    };
  }
  const confidenceDistribution: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
  for (const r of recs) confidenceDistribution[r.confidence] += 1;
  return {
    perSetting,
    testedUsers: users.size,
    testedDevices: devices.size,
    calibrationSessions,
    totalRecommendations: recs.length,
    confidenceDistribution,
    missingDataRate: recs.length ? round2(recs.reduce((s, r) => s + (1 - r.dataCompleteness), 0) / recs.length) : null,
    failureCases,
  };
}
