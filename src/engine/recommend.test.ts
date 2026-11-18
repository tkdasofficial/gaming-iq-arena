import { describe, expect, test } from 'vitest';
import gamesFixture from './__fixtures__/games.json';
import {
  buildRecommendation,
  fireButtonSize,
  formatRecommendationText,
  normalizeDevice,
  RecommendationError,
  type GameRecord,
} from './recommend';

// Mirrors the game rows stored in the `games` table.
const games = gamesFixture as unknown as GameRecord[];
const game = (id: string) => games.find((g) => g.id === id) as GameRecord;

const s25Ultra = normalizeDevice(
  {
    id: 'samsung-galaxy-s25-ultra',
    brandId: 'samsung',
    brand: 'Samsung',
    model: 'Galaxy S25 Ultra',
    os: 'Android',
    display: { sizeInches: 6.9, resolution: '3120 x 1440', refreshHz: 120, touchSamplingHz: 240 },
    gyroscopeSupport: 'hardware',
    verificationStatus: 'verified',
  },
  { manufacturer: 'Qualcomm', name: 'Snapdragon 8 Elite', gpuModel: 'Adreno 830' }
);

const redmi13 = normalizeDevice(
  {
    id: 'redmi-13-5g',
    brandId: 'redmi',
    brand: 'Redmi',
    model: 'Redmi 13 5G',
    display: { sizeInches: 6.79, refreshHz: 120, touchSamplingHz: 240 },
    gyroscopeSupport: 'unknown',
  },
  null
);

describe('device data is never invented', () => {
  test('missing specs stay empty instead of getting defaults', () => {
    const d = normalizeDevice({ id: 'x', brand: 'Vivo', model: 'V40 Pro', display: {} }, null);
    expect(d.display.refreshHz).toBeNull();
    expect(d.display.sizeInches).toBeNull();
    expect(d.display.touchSamplingHz).toBeNull();
    expect(d.ramGb).toEqual([]);
    expect(d.gyroscope).toBe('unknown');
  });

  test('a phone without verified display data cannot be generated', () => {
    const d = normalizeDevice({ id: 'x', brand: 'Vivo', model: 'V40 Pro', display: { sizeInches: 6.78 } }, null);
    expect(() => buildRecommendation(d, game('free-fire'))).toThrow(RecommendationError);
  });
});

describe('results contain the six core settings', () => {
  test.each(['free-fire', 'bgmi', 'pubg-mobile'])('%s', (id) => {
    const rec = buildRecommendation(s25Ultra, game(id));
    expect(rec.core.map((c) => c.label)).toEqual(['General', 'Red Dot', '2X Scope', '4X Scope', 'Sniper Scope', 'Free Look']);
  });
});

describe('gyroscope only where supported', () => {
  test('Free Fire never shows gyroscope settings', () => {
    const rec = buildRecommendation(s25Ultra, game('free-fire'));
    expect(rec.gyro).toBe('game-unsupported');
    expect(rec.groups.some((g) => g.id === 'gyro')).toBe(false);
  });

  test('BGMI shows gyroscope settings for a verified hardware gyroscope', () => {
    const rec = buildRecommendation(s25Ultra, game('bgmi'));
    expect(rec.gyro).toBe('included');
    expect(rec.groups.find((g) => g.id === 'gyro')?.settings).toHaveLength(8);
  });

  test('BGMI hides gyroscope settings when the gyroscope is not verified', () => {
    const rec = buildRecommendation(redmi13, game('bgmi'));
    expect(rec.gyro).toBe('not-verified');
    expect(rec.groups.some((g) => g.id === 'gyro')).toBe(false);
    expect(rec.extras.find((e) => e.label === 'Gyroscope')?.value).toBe('Off');
  });
});

test('each game uses its own configuration', () => {
  const bgmi = buildRecommendation(s25Ultra, game('bgmi'));
  const pubg = buildRecommendation(s25Ultra, game('pubg-mobile'));
  expect(bgmi.core[0].value).not.toBe(pubg.core[0].value);
});

test('Free Fire values stay inside the 0–200 in-game scale', () => {
  const rec = buildRecommendation(s25Ultra, game('free-fire'));
  for (const c of rec.core) {
    expect(c.value).toBeGreaterThan(0);
    expect(c.value).toBeLessThanOrEqual(200);
  }
});

test('fire button size follows screen size', () => {
  expect(fireButtonSize(6.2)).toBe(44);
  expect(fireButtonSize(6.6)).toBe(46);
  expect(fireButtonSize(6.9)).toBe(48);
  expect(fireButtonSize(7.6)).toBe(52);
});

test('copy text lists every recommended value', () => {
  const rec = buildRecommendation(s25Ultra, game('bgmi'));
  const text = formatRecommendationText(rec);
  const total = rec.groups.reduce((n, g) => n + g.settings.length, 0);
  expect(text.split('\n').filter((l) => /: \d+%$/.test(l))).toHaveLength(total);
  expect(text).toContain('Samsung Galaxy S25 Ultra');
});
