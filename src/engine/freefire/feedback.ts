/**
 * Feedback adjusts exactly one setting. Overshooting / too fast lowers it, undershooting / too slow
 * raises it, shaky lowers it by a smaller step, comfortable / accurate keeps it and marks it stable.
 * Feedback belongs to one player on one phone; it is never applied to other players.
 */
import type { ModelConfig, SettingKey } from './config';

export const FEEDBACK_TYPES = ['overshooting', 'undershooting', 'unstable', 'too_fast', 'too_slow', 'comfortable', 'accurate'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export const STABLE_FEEDBACK: readonly FeedbackType[] = ['comfortable', 'accurate'];

export function feedbackDelta(type: FeedbackType, setting: SettingKey, cfg: ModelConfig): number {
  const step = cfg.settings[setting].feedbackStep;
  switch (type) {
    case 'overshooting':
    case 'too_fast':
      return -step;
    case 'undershooting':
    case 'too_slow':
      return step;
    case 'unstable':
      return -Math.round(step * cfg.feedback.unstableStepFactor);
    default:
      return 0;
  }
}

export function applyFeedback(previous: number, type: FeedbackType, setting: SettingKey, cfg: ModelConfig): number {
  const v = Math.round(previous + feedbackDelta(type, setting, cfg));
  return Math.max(cfg.slider.min, Math.min(cfg.slider.max, v));
}

/** Applies feedback to a full set of values; only `setting` can change. */
export function applyFeedbackToSet(values: Record<SettingKey, number>, setting: SettingKey, type: FeedbackType, cfg: ModelConfig): Record<SettingKey, number> {
  return { ...values, [setting]: applyFeedback(values[setting], type, setting, cfg) };
}

export interface FeedbackEvent {
  settingKey: SettingKey;
  previousValue: number;
  newValue: number;
  type: FeedbackType;
  createdAt: string;
}

/** The player's latest value for one setting from their own feedback history. */
export function personalValue(events: FeedbackEvent[], setting: SettingKey): { value: number; stable: boolean } | null {
  const latest = events.filter((e) => e.settingKey === setting).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return latest ? { value: latest.newValue, stable: STABLE_FEEDBACK.includes(latest.type) } : null;
}
