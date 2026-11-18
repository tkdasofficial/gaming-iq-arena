import blueprint from '../../firebase-blueprint.json';

export const BLUEPRINT_ID_REGEX = new RegExp(
  blueprint.entities.SavedSetup.properties.id.pattern
);

export const BLUEPRINT_LIMITS = {
  idMaxLength: blueprint.entities.SavedSetup.properties.id.maxLength,
  setupNameMaxLength: blueprint.entities.SavedSetup.properties.name.maxLength,
  preferredFpsMaxLength: blueprint.entities.SavedSetup.properties.preferredFps.maxLength,
  dpiOverrideMaxLength: blueprint.entities.SavedSetup.properties.dpiOverride.maxLength,
  currentSensitivityMaxLength:
    blueprint.entities.SavedSetup.properties.currentSensitivity.maxLength,
  deviceBrandMaxLength: blueprint.entities.SmartphoneDevice.properties.brand.maxLength,
  deviceModelMaxLength: blueprint.entities.SmartphoneDevice.properties.model.maxLength,
  deviceChipsetMaxLength: blueprint.entities.SmartphoneDevice.properties.chipsetName.maxLength,
  deviceResolutionMaxLength: blueprint.entities.CustomDevice.properties.resolution.maxLength,
  presetNameMaxLength: blueprint.entities.CommunityPreset.properties.name.maxLength,
  presetArchetypeMaxLength:
    blueprint.entities.CommunityPreset.properties.playerArchetype.maxLength,
  presetHeadlineMaxLength:
    blueprint.entities.CommunityPreset.properties.headlineMetric.maxLength,
  presetDescriptionMaxLength:
    blueprint.entities.CommunityPreset.properties.description.maxLength,
  userDisplayNameMaxLength:
    blueprint.entities.UserAccount.properties.displayName.maxLength,
  userEmailMaxLength: blueprint.entities.UserAccount.properties.email.maxLength,
  userPhotoMaxLength: blueprint.entities.UserAccount.properties.photoURL.maxLength,
} as const;

export function sanitizeId(raw: string, fallbackPrefix = 'item'): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, BLUEPRINT_LIMITS.idMaxLength);
  if (cleaned && BLUEPRINT_ID_REGEX.test(cleaned)) {
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
