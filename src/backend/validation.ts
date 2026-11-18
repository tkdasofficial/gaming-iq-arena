// Field limits shared by the UI and the Supabase data layer.
export const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export const FIELD_LIMITS = {
  idMaxLength: 128,
  setupNameMaxLength: 100,
  preferredFpsMaxLength: 40,
  dpiOverrideMaxLength: 16,
  currentSensitivityMaxLength: 160,
  deviceBrandMaxLength: 60,
  deviceModelMaxLength: 80,
  deviceChipsetMaxLength: 80,
  deviceResolutionMaxLength: 40,
  presetNameMaxLength: 80,
  presetArchetypeMaxLength: 60,
  presetHeadlineMaxLength: 80,
  presetDescriptionMaxLength: 240,
  userDisplayNameMaxLength: 80,
  userEmailMaxLength: 160,
  userPhotoMaxLength: 500,
} as const;

export function sanitizeId(raw: string, fallbackPrefix = 'item'): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, FIELD_LIMITS.idMaxLength);
  if (cleaned && ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}`;
}

export function clampString(value: string, maxLength: number, fallback = ''): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
