/**
 * Game-specific sensitivity structures.
 *
 * Each game points at one sensitivity schema (Free Fire has its own; PUBG Mobile and BGMI
 * share one). A schema owns its categories and sliders (name, slider range, order); each game
 * stores its own starting values separately. This module turns those database rows into the
 * GameRecord the engine uses, and drops anything that does not belong to the game's schema.
 */
import { CORE_ORDER, RecommendationError, type CoreSettingId, type GameConfig, type GameRecord } from './recommend';

export interface SchemaRow {
  id: string;
  name: string;
  unit: string;
}

export interface CategoryRow {
  id: string;
  schema_id: string;
  label: string;
  description: string | null;
  display_order: number;
  requires_gyro: boolean;
}

export interface SettingRow {
  id: string;
  schema_id: string;
  category_id: string;
  key: string;
  label: string;
  description: string | null;
  min_value: number | string;
  max_value: number | string;
  display_order: number;
  input_kind: string;
  core_slot: string | null;
}

export interface ProfileRow {
  game_id: string;
  schema_id: string;
  setting_id: string;
  recommended_value: number | string;
}

export interface GameRow {
  id: string;
  name: string;
  short_name: string;
  publisher: string;
  supports_gyro: boolean;
  sensitivity_schema_id: string | null;
  config: unknown;
}

export interface SensitivitySource {
  game: GameRow;
  schema: SchemaRow | null;
  categories: CategoryRow[];
  settings: SettingRow[];
  profiles: ProfileRow[];
}

export interface AssembledGame {
  game: GameRecord;
  /** Rows that were ignored because they don't fit this game (for server logs). */
  issues: string[];
}

const finite = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const byOrder = <T extends { display_order: number }>(a: T, b: T) => a.display_order - b.display_order;
const shortId = (schemaId: string, id: string) => (id.startsWith(`${schemaId}.`) ? id.slice(schemaId.length + 1) : id);

export function assembleGameRecord(src: SensitivitySource): AssembledGame {
  const { game } = src;
  const schemaId = game.sensitivity_schema_id;
  if (!schemaId || !src.schema || src.schema.id !== schemaId) {
    throw new RecommendationError(`${game.name} has no sensitivity setup yet.`);
  }
  const issues: string[] = [];

  const categories = src.categories
    .filter((c) => {
      if (c.schema_id === schemaId) return true;
      issues.push(`category ${c.id} belongs to ${c.schema_id}, not ${schemaId}`);
      return false;
    })
    .sort(byOrder);
  const groupIdOf = new Map(categories.map((c) => [c.id, shortId(schemaId, c.id)]));

  const settings = src.settings
    .filter((s) => {
      if (s.schema_id !== schemaId || !groupIdOf.has(s.category_id)) {
        issues.push(`setting ${s.id} is not part of ${schemaId}`);
        return false;
      }
      const min = finite(s.min_value);
      const max = finite(s.max_value);
      if (min === null || max === null || min >= max) {
        issues.push(`setting ${s.id} has no valid slider range`);
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const ca = categories.findIndex((c) => c.id === a.category_id);
      const cb = categories.findIndex((c) => c.id === b.category_id);
      return ca - cb || a.display_order - b.display_order;
    });
  if (settings.length === 0) throw new RecommendationError(`${game.name} has no sensitivity setup yet.`);
  const settingIds = new Set(settings.map((s) => s.id));

  const base = new Map<string, number>();
  for (const p of src.profiles) {
    if (p.game_id !== game.id || p.schema_id !== schemaId || !settingIds.has(p.setting_id)) {
      issues.push(`value for ${p.setting_id} does not belong to ${game.id}`);
      continue;
    }
    const s = settings.find((x) => x.id === p.setting_id) as SettingRow;
    const v = finite(p.recommended_value);
    if (v === null || v < (finite(s.min_value) as number) || v > (finite(s.max_value) as number)) {
      issues.push(`value for ${p.setting_id} is outside its slider range`);
      continue;
    }
    base.set(p.setting_id, v);
  }

  const usedCore = new Set<CoreSettingId>();
  const extra = (game.config ?? {}) as { extras?: unknown; options?: unknown };
  const config: GameConfig = {
    unit: src.schema.unit ?? '',
    groups: categories
      .filter((c) => settings.some((s) => s.category_id === c.id))
      .map((c) => ({
        id: groupIdOf.get(c.id) as string,
        label: c.label,
        ...(c.description ? { description: c.description } : {}),
        ...(c.requires_gyro ? { requiresGyro: true } : {}),
      })),
    settings: settings.map((s) => {
      const slot = CORE_ORDER.find((id) => id === s.core_slot);
      const core = slot && !usedCore.has(slot) ? slot : undefined;
      if (core) usedCore.add(core);
      return {
        id: s.id,
        key: s.key,
        label: s.label,
        group: groupIdOf.get(s.category_id) as string,
        base: base.get(s.id) ?? null,
        min: finite(s.min_value) as number,
        max: finite(s.max_value) as number,
        factor: s.input_kind === 'gyro' ? 'gyro' : 'touch',
        ...(core ? { core } : {}),
        ...(s.description ? { description: s.description } : {}),
      };
    }),
    extras: Array.isArray(extra.extras) ? (extra.extras.filter((e) => e === 'fireButton' || e === 'gyroMode') as GameConfig['extras']) : [],
    ...(Array.isArray(extra.options) ? { options: extra.options as GameConfig['options'] } : {}),
  };

  return {
    game: {
      id: game.id,
      name: game.name,
      shortName: game.short_name,
      publisher: game.publisher,
      supportsGyro: game.supports_gyro,
      config,
    },
    issues,
  };
}
