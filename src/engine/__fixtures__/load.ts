import fixture from './sensitivity.json';
import { assembleGameRecord, type SensitivitySource } from '../sensitivity';
import type { GameRecord } from '../recommend';

/** Mirrors the rows in sensitivity_schemas / _categories / _settings, games and game_sensitivity_profiles. */
export type SensitivityFixture = {
  schemas: SensitivitySource['schema'][];
  categories: SensitivitySource['categories'];
  settings: SensitivitySource['settings'];
  games: SensitivitySource['game'][];
  profiles: SensitivitySource['profiles'];
};
export const db = fixture as unknown as SensitivityFixture;

/** Builds a game's source rows the same way the server reads them (by schema and game id). */
export function sourceFor(gameId: string): SensitivitySource {
  const game = db.games.find((g) => g.id === gameId);
  if (!game) throw new Error(`no fixture game ${gameId}`);
  const schemaId = game.sensitivity_schema_id;
  return {
    game,
    schema: db.schemas.find((s) => s?.id === schemaId) ?? null,
    categories: db.categories.filter((c) => c.schema_id === schemaId),
    settings: db.settings.filter((s) => s.schema_id === schemaId),
    profiles: db.profiles.filter((p) => p.game_id === gameId),
  };
}

export const gameRecord = (gameId: string): GameRecord => assembleGameRecord(sourceFor(gameId)).game;
