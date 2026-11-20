import { createServerFn } from '@tanstack/react-start';
import { computeRecommendation, publicClient, validateIds, type RecommendationResponse } from './recommend.core';

export type { RecommendationResponse } from './recommend.core';

/**
 * Generates a game-specific sensitivity recommendation on the server for anyone (signed out too).
 * Only ids come from the browser; specs, measurements and configuration are read from the database.
 * Nothing is stored. Signed-in players use generatePersonalRecommendation instead.
 */
export const generateRecommendation = createServerFn({ method: 'POST' })
  .inputValidator(validateIds)
  .handler(async ({ data }): Promise<RecommendationResponse> => {
    const db = publicClient();
    if (!db) return { ok: false, error: 'The service is not configured right now.' };
    const res = await computeRecommendation(db, data);
    return res.ok ? { ok: true, recommendation: res.value.recommendation } : res;
  });
