import { describe, expect, test } from 'vitest';
import { db, gameRecord, sourceFor } from './__fixtures__/load';
import { buildRecommendation, normalizeDevice, RecommendationError } from './recommend';
import { assembleGameRecord } from './sensitivity';

const gyroPhone = normalizeDevice(
  { id: 'p', brand: 'Samsung', model: 'Galaxy S25 Ultra', os: 'Android', display: { sizeInches: 6.9, refreshHz: 120, touchSamplingHz: 240 }, gyroscopeSupport: 'hardware' },
  null
);
const noGyroPhone = normalizeDevice(
  { id: 'q', brand: 'Redmi', model: 'Redmi 13 5G', display: { sizeInches: 6.79, refreshHz: 120 }, gyroscopeSupport: 'unknown' },
  null
);

const FREE_FIRE = ['General', 'Red Dot', '2X Scope', '4X Scope', 'Sniper Scope', 'Free Look'];
const PUBG_SCOPES = [
  'TPP No Scope',
  'FPP No Scope',
  'TPP Aim',
  'FPP Aim',
  'Red Dot, Holographic, Aim Assist',
  '2X Scope',
  '3X Scope, Win94',
  '4X Scope, VSS',
  '6X Scope',
  '8X Scope',
];
const PUBG_SECTIONS = ['Camera', 'ADS', 'Gyroscope', 'ADS Gyroscope', 'Free Look'];
const PUBG_ONLY = ['TPP No Scope', 'FPP No Scope', 'TPP Aim', 'FPP Aim', 'Camera', 'ADS', 'Gyroscope', 'ADS Gyroscope'];

const labels = (rec: ReturnType<typeof buildRecommendation>) => rec.groups.flatMap((g) => g.settings.map((s) => s.label));

describe('Free Fire has its own six settings', () => {
  test('exactly the six Free Fire sliders, in order, on 0–200', () => {
    const rec = buildRecommendation(gyroPhone, gameRecord('free-fire'));
    expect(rec.groups).toHaveLength(1);
    expect(labels(rec)).toEqual(FREE_FIRE);
    for (const s of rec.groups[0].settings) {
      expect(s.min).toBe(0);
      expect(s.max).toBe(200);
    }
  });

  test('no PUBG section or slider ever shows up', () => {
    const rec = buildRecommendation(gyroPhone, gameRecord('free-fire'));
    const shown = [...labels(rec), ...rec.groups.map((g) => g.label)];
    for (const name of PUBG_ONLY) expect(shown).not.toContain(name);
  });
});

describe.each(['pubg-mobile', 'bgmi'])('%s uses the PUBG structure', (id) => {
  test('Camera, ADS, Gyroscope, ADS Gyroscope and Free Look as separate sections', () => {
    const rec = buildRecommendation(gyroPhone, gameRecord(id));
    expect(rec.groups.map((g) => g.label)).toEqual(PUBG_SECTIONS);
    for (const section of ['Camera', 'ADS', 'Gyroscope', 'ADS Gyroscope']) {
      expect(rec.groups.find((g) => g.label === section)?.settings.map((s) => s.label)).toEqual(PUBG_SCOPES);
    }
    expect(rec.groups.find((g) => g.label === 'Free Look')?.settings.map((s) => s.label)).toEqual([
      'TPP Camera (Character, Vehicle)',
      'FPP Camera (Character)',
      'Camera (Parachuting)',
    ]);
  });

  test('never shows Free Fire’s General or Sniper Scope', () => {
    const rec = buildRecommendation(gyroPhone, gameRecord(id));
    expect(labels(rec)).not.toContain('General');
    expect(labels(rec)).not.toContain('Sniper Scope');
  });

  test('gyroscope sections only with a verified hardware gyroscope', () => {
    const rec = buildRecommendation(noGyroPhone, gameRecord(id));
    expect(rec.groups.map((g) => g.label)).toEqual(['Camera', 'ADS', 'Free Look']);
  });

  test('slider ranges: 1–300% for touch, 1–400% for gyroscope', () => {
    const rec = buildRecommendation(gyroPhone, gameRecord(id));
    for (const g of rec.groups) {
      const max = g.id === 'gyro' || g.id === 'ads-gyro' ? 400 : 300;
      for (const s of g.settings) {
        expect([s.min, s.max]).toEqual([1, max]);
        expect(s.value).not.toBeNull();
        expect(s.value as number).toBeGreaterThanOrEqual(1);
        expect(s.value as number).toBeLessThanOrEqual(max);
      }
    }
  });
});

test('BGMI and PUBG Mobile share one structure but keep their own values', () => {
  const bgmi = buildRecommendation(gyroPhone, gameRecord('bgmi'));
  const pubg = buildRecommendation(gyroPhone, gameRecord('pubg-mobile'));
  const shape = (r: typeof bgmi) => r.groups.map((g) => [g.id, g.settings.map((s) => s.key)]);
  expect(shape(bgmi)).toEqual(shape(pubg));
  expect(bgmi.gameId).not.toBe(pubg.gameId);
  expect(bgmi.groups[0].settings[0].value).not.toBe(pubg.groups[0].settings[0].value);
});

describe('validation', () => {
  test('stored values always belong to a setting of the game’s own schema', () => {
    for (const p of db.profiles) {
      const game = db.games.find((g) => g.id === p.game_id);
      const setting = db.settings.find((s) => s.id === p.setting_id);
      expect(setting?.schema_id).toBe(game?.sensitivity_schema_id);
    }
  });

  test('Free Fire ignores PUBG sections, sliders and values handed to it', () => {
    const src = sourceFor('free-fire');
    const pubg = sourceFor('pubg-mobile');
    const { game, issues } = assembleGameRecord({
      ...src,
      categories: [...src.categories, ...pubg.categories],
      settings: [...src.settings, ...pubg.settings],
      profiles: [...src.profiles, ...pubg.profiles.map((p) => ({ ...p, game_id: 'free-fire' }))],
    });
    expect(game.config.settings.map((s) => s.label)).toEqual(FREE_FIRE);
    expect(issues.length).toBeGreaterThan(0);
  });

  test('PUBG ignores Free Fire sliders handed to it', () => {
    const src = sourceFor('pubg-mobile');
    const ff = sourceFor('free-fire');
    const { game } = assembleGameRecord({ ...src, categories: [...src.categories, ...ff.categories], settings: [...src.settings, ...ff.settings] });
    expect(game.config.groups.map((g) => g.label)).toEqual(PUBG_SECTIONS);
    expect(game.config.settings.some((s) => s.id.startsWith('free-fire.'))).toBe(false);
  });

  test('a starting value outside the slider range is dropped, not shown', () => {
    const src = sourceFor('free-fire');
    const profiles = src.profiles.map((p) => (p.setting_id === 'free-fire.sensitivity.general' ? { ...p, recommended_value: 250 } : p));
    const { game, issues } = assembleGameRecord({ ...src, profiles });
    expect(game.config.settings.find((s) => s.key === 'general')?.base).toBeNull();
    expect(issues.join(' ')).toContain('outside');
  });

  test('a missing starting value shows the slider without a number', () => {
    const src = sourceFor('bgmi');
    const profiles = src.profiles.filter((p) => p.setting_id !== 'pubg-family.camera.tpp-aim');
    const rec = buildRecommendation(gyroPhone, assembleGameRecord({ ...src, profiles }).game);
    const tppAim = rec.groups.find((g) => g.id === 'camera')?.settings.find((s) => s.key === 'tpp-aim');
    expect(tppAim?.value).toBeNull();
  });

  test('a game without a sensitivity setup cannot be generated', () => {
    const src = sourceFor('free-fire');
    expect(() => assembleGameRecord({ ...src, game: { ...src.game, sensitivity_schema_id: null } })).toThrow(RecommendationError);
  });
});
