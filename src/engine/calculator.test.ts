import { test } from 'vitest';
import assert from 'node:assert/strict';
import { calculateSensitivity, buildShareCode } from './calculator';
import {
  calculateDeviceAge,
  formatDeviceFullName,
  getGameCompatibilitySummary,
  getSupportedFpsOptions,
  searchDevices,
} from './devices';
import type { CalibrationInput, DeviceProfile } from './types';

const iphone15: DeviceProfile = {
  id: 'iphone-15-pro',
  brand: 'Apple',
  model: 'iPhone 15 Pro',
  os: 'iOS',
  chipset: 'Apple A17 Pro',
  ramGb: 8,
  storageGb: 256,
  screenInches: 6.1,
  resolution: '2556 × 1179',
  refreshHz: 120,
  touchSamplingHz: 240,
  supportedFpsByGame: {
    'free-fire': ['60 FPS', '90 FPS'],
    'pubg-bgmi': ['60 FPS (Extreme)', '90 FPS', '120 FPS (Ultra Extreme)'],
  },
  tier: 'Flagship',
};

const ipadPro: DeviceProfile = {
  id: 'ipad-pro-m4',
  brand: 'Apple',
  model: 'iPad Pro 11" (M4)',
  os: 'iOS',
  chipset: 'Apple M4',
  ramGb: 16,
  storageGb: 512,
  screenInches: 11.0,
  resolution: '2420 × 1668',
  refreshHz: 120,
  touchSamplingHz: 240,
  supportedFpsByGame: {
    'free-fire': ['60 FPS', '90 FPS'],
    'pubg-bgmi': ['60 FPS (Extreme)', '90 FPS', '120 FPS (Ultra Extreme)'],
  },
  tier: 'Tablet',
};

const redmi60Hz: DeviceProfile = {
  id: 'redmi-note-12',
  brand: 'Redmi',
  model: 'Note 12 4G',
  os: 'Android',
  chipset: 'Snapdragon 685',
  ramGb: 6,
  storageGb: 128,
  screenInches: 6.67,
  resolution: '2400 × 1080',
  refreshHz: 90,
  touchSamplingHz: 180,
  supportedFpsByGame: {
    'free-fire': ['30 FPS', '60 FPS'],
    'pubg-bgmi': ['30 FPS (High)', '40 FPS (Ultra)'],
  },
  tier: 'Budget',
};

test('Free Fire returns exact 6 sliders within realistic 0-200 calibrated bands', () => {
  const input: CalibrationInput = {
    game: 'free-fire',
    device: iphone15,
    claw: '2-finger',
    playstyle: 'balanced',
    gyro: 'off',
    preferredFps: '90 FPS',
  };
  const result = calculateSensitivity(input);
  assert.equal(result.sliders.length, 6);
  assert.equal(result.scaleMax, 200);

  const byKey = Object.fromEntries(result.sliders.map((s) => [s.key, s.value]));
  assert.ok(byKey['ff-general'] >= 175 && byKey['ff-general'] <= 200);
  assert.ok(byKey['ff-red-dot'] >= 165 && byKey['ff-red-dot'] <= 195);
  assert.ok(byKey['ff-sniper'] >= 80 && byKey['ff-sniper'] <= 120);
  assert.ok(byKey['ff-free-look'] >= 95 && byKey['ff-free-look'] <= 145);
});

test('Internal storage capacity does not alter sensitivity calculations', () => {
  const base: CalibrationInput = {
    game: 'pubg-bgmi',
    device: { ...iphone15, storageGb: 128 },
    claw: '4-finger',
    playstyle: 'balanced',
    gyro: 'always-on',
    preferredFps: '90 FPS',
  };
  const largeStorage: CalibrationInput = {
    ...base,
    device: { ...iphone15, storageGb: 1024 },
  };
  assert.deepEqual(
    calculateSensitivity(base).sliders,
    calculateSensitivity(largeStorage).sliders
  );
});

test('Free Fire aggressive rush sensitivity is higher on General & Red Dot than sniper focus', () => {
  const rusher = calculateSensitivity({
    game: 'free-fire',
    device: iphone15,
    claw: '3-finger',
    playstyle: 'aggressive-rush',
    gyro: 'off',
    preferredFps: '90 FPS',
  });
  const sniper = calculateSensitivity({
    game: 'free-fire',
    device: iphone15,
    claw: '3-finger',
    playstyle: 'sniper-focus',
    gyro: 'off',
    preferredFps: '90 FPS',
  });

  const rusherGen = rusher.sliders.find((s) => s.key === 'ff-general')!.value;
  const sniperGen = sniper.sliders.find((s) => s.key === 'ff-general')!.value;
  assert.ok(rusherGen > sniperGen);

  const rusherSniperScope = rusher.sliders.find((s) => s.key === 'ff-sniper')!.value;
  const sniperSniperScope = sniper.sliders.find((s) => s.key === 'ff-sniper')!.value;
  assert.ok(sniperSniperScope > rusherSniperScope);
});

test('BGMI includes Free Look, Camera, ADS and toggles Gyro/ADS Gyro cleanly', () => {
  const nonGyro = calculateSensitivity({
    game: 'pubg-bgmi',
    device: iphone15,
    claw: '4-finger',
    playstyle: 'balanced',
    gyro: 'off',
    preferredFps: '90 FPS',
  });
  assert.equal(nonGyro.sliders.filter((s) => s.category === 'free-look').length, 3);
  assert.equal(nonGyro.sliders.filter((s) => s.category === 'camera').length, 8);
  assert.equal(nonGyro.sliders.filter((s) => s.category === 'ads').length, 8);
  assert.equal(nonGyro.sliders.filter((s) => s.category === 'gyro').length, 0);
  assert.equal(nonGyro.sliders.filter((s) => s.category === 'ads-gyro').length, 0);

  const fullGyro = calculateSensitivity({
    game: 'pubg-bgmi',
    device: iphone15,
    claw: '6-finger',
    playstyle: 'tactical',
    gyro: 'always-on',
    preferredFps: '120 FPS (Ultra Extreme)',
  });
  assert.equal(fullGyro.sliders.filter((s) => s.category === 'gyro').length, 8);
  assert.equal(fullGyro.sliders.filter((s) => s.category === 'ads-gyro').length, 8);
});

test('Tablet screen size scales down touch & gyro sensitivity vs compact phone', () => {
  const phoneRes = calculateSensitivity({
    game: 'pubg-bgmi',
    device: redmi60Hz,
    claw: '4-finger',
    playstyle: 'balanced',
    gyro: 'always-on',
    preferredFps: '40 FPS (Ultra)',
  });
  const tabletRes = calculateSensitivity({
    game: 'pubg-bgmi',
    device: ipadPro,
    claw: '4-finger',
    playstyle: 'balanced',
    gyro: 'always-on',
    preferredFps: '120 FPS (Ultra Extreme)',
  });

  const phoneGyro = phoneRes.sliders.find((s) => s.key === 'gyro-red-dot')!.value;
  const tabletGyro = tabletRes.sliders.find((s) => s.key === 'gyro-red-dot')!.value;
  assert.ok(phoneGyro > tabletGyro);
});

test('Supported FPS options fall back cleanly without fabricating unverified 120 FPS', () => {
  const bgmiUnverified120Hz = getGameCompatibilitySummary(iphone15, 'pubg-bgmi');
  assert.equal(bgmiUnverified120Hz.isVerified, false);
  assert.equal(bgmiUnverified120Hz.maxVerifiedFps, null);
  assert.equal(bgmiUnverified120Hz.options.includes('120 FPS (Ultra Extreme)'), false);

  const verifiedDevice: DeviceProfile = {
    ...iphone15,
    gameCompatibility: {
      bgmi: {
        id: 'iphone-15-pro__bgmi',
        visibility: 'public',
        deviceId: 'iphone-15-pro',
        gameKey: 'bgmi',
        supportedFps: [40, 60, 90, 120],
        maxVerifiedFps: 120,
        graphicsSettings: 'Smooth + Ultra Extreme',
        gyroscopeSupport: 'hardware',
        compatibilityRegion: 'India',
        sourceUrl: 'https://www.apple.com',
        verificationStatus: 'verified',
        lastVerifiedAt: '2026-01-15',
      },
    },
  };
  const verifiedSummary = getGameCompatibilitySummary(verifiedDevice, 'pubg-bgmi');
  assert.equal(verifiedSummary.isVerified, true);
  assert.equal(verifiedSummary.maxVerifiedFps, 120);
  assert.ok(verifiedSummary.options.includes('120 FPS (Ultra Extreme)'));
  assert.ok(getSupportedFpsOptions(verifiedDevice, 'free-fire').includes('90 FPS'));
});

test('Slider overrides clamp cleanly and update share code deterministically', () => {
  const input: CalibrationInput = {
    game: 'free-fire',
    device: iphone15,
    claw: '2-finger',
    playstyle: 'balanced',
    gyro: 'off',
    preferredFps: '90 FPS',
  };
  const res = calculateSensitivity(input, { 'ff-general': 999 });
  const gen = res.sliders.find((s) => s.key === 'ff-general')!;
  assert.equal(gen.value, 200);
  assert.equal(res.shareCode, buildShareCode(input, res.sliders));
});

test('Device search matches brand, model, chipset, and OS case-insensitively', () => {
  const sampleDevices = [iphone15, ipadPro, redmi60Hz];
  const snap = searchDevices(sampleDevices, 'snapdragon');
  assert.equal(snap.length, 1);
  assert.equal(snap[0].id, 'redmi-note-12');
  const ios = searchDevices(sampleDevices, 'apple');
  assert.equal(ios.length, 2);
  assert.ok(ios.every((d) => d.os === 'iOS'));
});

test('formatDeviceFullName avoids sub-brand duplication and normalizes Pixel naming', () => {
  assert.equal(formatDeviceFullName('POCO', 'POCO F7 Pro'), 'POCO F7 Pro');
  assert.equal(formatDeviceFullName('iQOO', 'iQOO 15'), 'iQOO 15');
  assert.equal(formatDeviceFullName('Google Pixel', 'Pixel 9 Pro'), 'Google Pixel 9 Pro');
  assert.equal(formatDeviceFullName('Samsung', 'Galaxy S25 Ultra'), 'Samsung Galaxy S25 Ultra');
});

test('calculateDeviceAge computes deterministic relative release ages', () => {
  const ref = new Date('2026-03-20T00:00:00Z');
  assert.equal(calculateDeviceAge('2026-03-10', ref), '< 1 mo old');
  assert.equal(calculateDeviceAge('2025-03-20', ref), '1 yr old');
  assert.equal(calculateDeviceAge('2024-01-15', ref), '2 yrs 2 mos old');
  assert.equal(calculateDeviceAge('2026-06-01', ref), 'Upcoming (~3 mos)');
  assert.equal(calculateDeviceAge('invalid-date', ref), null);
});

test('High refresh rates (165Hz/185Hz/240Hz) and null touchSamplingHz compute finite sensitivities', () => {
  for (const hz of [165, 185, 240]) {
    const dev: DeviceProfile = {
      ...iphone15,
      refreshHz: hz,
      touchSamplingHz: null,
      screenInches: 6.83,
    };
    const res = calculateSensitivity({
      game: 'pubg-bgmi',
      device: dev,
      claw: '4-finger',
      playstyle: 'aggressive',
      gyro: 'always-on',
      preferredFps: '120 FPS (Ultra Extreme)',
    });
    assert.ok(res.sliders.length > 0);
    assert.ok(res.sliders.every((s) => Number.isFinite(s.value) && s.value >= s.min && s.value <= s.max));
  }
});
