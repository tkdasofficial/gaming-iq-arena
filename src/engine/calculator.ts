import { formatDeviceFullName } from './devices';
import type {
  CalibrationInput,
  CalibrationResult,
  CameraPref,
  ClawStyle,
  DeviceProfile,
  HardwareTips,
  Playstyle,
  SensitivitySliderItem,
} from './types';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function getScreenFactor(device: DeviceProfile): number {
  if (device.screenInches >= 9.5) return 0.86;
  if (device.screenInches >= 8.0) return 0.91;
  if (device.screenInches <= 6.2) return 1.03;
  if (device.screenInches <= 6.6) return 1.01;
  return 1.0;
}

function getRefreshFactor(refreshHz: number): number {
  if (refreshHz >= 165) return 0.95;
  if (refreshHz >= 144) return 0.96;
  if (refreshHz >= 120) return 0.98;
  if (refreshHz >= 90) return 1.01;
  return 1.04;
}

function getTouchSamplingFactor(touchHz?: number | null): number {
  if (touchHz == null || !Number.isFinite(touchHz)) return 1.0;
  if (touchHz >= 480) return 0.98;
  if (touchHz >= 300) return 0.99;
  if (touchHz <= 180) return 1.03;
  return 1.0;
}

function getClawTouchModifier(claw: ClawStyle): number {
  switch (claw) {
    case '2-finger':
      return 1.02;
    case '3-finger':
      return 1.0;
    case '4-finger':
      return 0.98;
    case '5-finger':
      return 0.96;
    case '6-finger':
      return 0.95;
  }
}

function getFreeFirePlaystyleOffsets(playstyle: Playstyle) {
  switch (playstyle) {
    case 'aggressive-rush':
    case 'aggressive':
      return { general: 8, redDot: 6, scope2x: 5, scope4x: 2, sniper: -4, freeLook: 8 };
    case 'headshot-focus':
      return { general: 5, redDot: 8, scope2x: 3, scope4x: 2, sniper: -2, freeLook: 4 };
    case 'sniper-focus':
      return { general: -6, redDot: -5, scope2x: -4, scope4x: 6, sniper: 12, freeLook: -6 };
    case 'balanced':
    case 'tactical':
    default:
      return { general: 0, redDot: 0, scope2x: 0, scope4x: 0, sniper: 0, freeLook: 0 };
  }
}

function getCameraPrefScalar(pref?: CameraPref): number {
  switch (pref) {
    case 'low':
      return 0.9;
    case 'high':
      return 1.1;
    case 'medium':
    default:
      return 1.0;
  }
}

function getPubgPlaystyleFactor(playstyle: Playstyle): { cam: number; ads: number; gyro: number; sniper: number } {
  switch (playstyle) {
    case 'aggressive':
    case 'aggressive-rush':
      return { cam: 1.08, ads: 1.08, gyro: 1.06, sniper: 0.95 };
    case 'tactical':
      return { cam: 0.96, ads: 0.98, gyro: 0.98, sniper: 1.04 };
    case 'sniper-focus':
      return { cam: 0.92, ads: 0.92, gyro: 0.94, sniper: 1.12 };
    case 'balanced':
    case 'headshot-focus':
    default:
      return { cam: 1.0, ads: 1.0, gyro: 1.0, sniper: 1.0 };
  }
}

function buildFreeFireHardwareTips(input: CalibrationInput): HardwareTips {
  const { device, playstyle, claw } = input;
  let fireSize = input.fireButtonSize ?? 46;
  if (!input.fireButtonSize) {
    if (playstyle === 'aggressive-rush' || playstyle === 'headshot-focus') fireSize = 45;
    if (playstyle === 'sniper-focus') fireSize = 50;
    if (device.screenInches >= 9.0) fireSize += 4;
    if (claw === '2-finger') fireSize += 1;
  }

  const dpi = input.dpiOverride?.trim()
    ? `${input.dpiOverride.trim()} DP`
    : device.os === 'iOS'
      ? `Cursor ${playstyle === 'aggressive-rush' ? '115' : '105'}`
      : `${device.screenInches >= 9 ? 500 : playstyle === 'aggressive-rush' ? 600 : 540} DP`;

  const graphicsPreset =
    device.ramGb >= 8 && device.refreshHz >= 120
      ? 'Ultra'
      : device.ramGb >= 6
        ? 'Standard'
        : 'Smooth';

  return {
    fireButtonSize: `${clamp(fireSize, 38, 64)}%`,
    recommendedDpi: dpi,
    graphicsPreset,
    frameRateTarget: input.preferredFps || `${device.refreshHz >= 90 ? '90' : '60'} FPS`,
  };
}

function buildPubgHardwareTips(input: CalibrationInput): HardwareTips {
  const { device } = input;

  const graphicsPreset =
    device.ramGb >= 8 && device.refreshHz >= 120
      ? 'Smooth + Ultra Extreme'
      : device.ramGb >= 6
        ? 'Smooth + Extreme'
        : 'Smooth + Ultra';

  const dpi = device.os === 'iOS' ? 'Native Touch' : 'Default (411–440 DP)';

  return {
    recommendedDpi: dpi,
    graphicsPreset,
    frameRateTarget: input.preferredFps || `${device.refreshHz >= 120 ? '120' : '60'} FPS`,
  };
}

export function buildShareCode(input: CalibrationInput, sliders: SensitivitySliderItem[]): string {
  const gamePrefix = input.game === 'free-fire' ? 'GIQ-FF' : 'GIQ-BGMI';
  const sum = sliders.reduce((acc, s) => acc + s.value, 0);
  const checksum = ((sum * 17 + input.device.refreshHz) % 8999) + 1000;
  const clawDigit = input.claw[0];
  const gyroChar =
    input.game === 'free-fire'
      ? 'T'
      : input.gyro === 'always-on'
        ? 'G2'
        : input.gyro === 'scope-on'
          ? 'G1'
          : 'G0';
  return `${gamePrefix}-${clawDigit}F-${gyroChar}-${checksum}`;
}

export function formatSummaryForClipboard(
  result: CalibrationResult,
  input: CalibrationInput
): string {
  const profileLine =
    input.game === 'free-fire'
      ? `${input.claw} | ${input.playstyle}`
      : `${input.claw} | ${input.playstyle} | Gyro: ${input.gyro}`;

  const deviceLabel = formatDeviceFullName(input.device.brand, input.device.model);
  const lines: string[] = [
    `Gaming IQ | ${result.gameLabel}`,
    `Device: ${deviceLabel} (${input.device.refreshHz}Hz)`,
    `Profile: ${profileLine}`,
    `Code: ${result.shareCode}`,
    '',
  ];

  for (const s of result.sliders) {
    lines.push(`${s.label}: ${s.value}${s.unit}`);
  }

  lines.push('');
  if (result.hardwareTips.fireButtonSize) {
    lines.push(`Fire Button Size: ${result.hardwareTips.fireButtonSize}`);
  }
  lines.push(`DPI / Touch: ${result.hardwareTips.recommendedDpi}`);
  lines.push(`FPS Target: ${result.hardwareTips.frameRateTarget}`);

  return lines.join('\n');
}

export function calculateSensitivity(
  input: CalibrationInput,
  overrides?: Record<string, number>
): CalibrationResult {
  // Note: device.storageGb is intentionally excluded from sensitivity math.
  const screenFactor = getScreenFactor(input.device);
  const refreshFactor = getRefreshFactor(input.device.refreshHz);
  const touchFactor = getTouchSamplingFactor(input.device.touchSamplingHz);
  const clawFactor = getClawTouchModifier(input.claw);

  const combinedTouchScalar = screenFactor * refreshFactor * touchFactor * clawFactor;

  if (input.game === 'free-fire') {
    const offsets = getFreeFirePlaystyleOffsets(input.playstyle);

    const rawSliders: SensitivitySliderItem[] = [
      {
        key: 'ff-general',
        label: 'General',
        category: 'general',
        value: clamp(188 * combinedTouchScalar + offsets.general, 140, 200),
        min: 0,
        max: 200,
        unit: '',
      },
      {
        key: 'ff-red-dot',
        label: 'Red Dot',
        category: 'general',
        value: clamp(180 * combinedTouchScalar + offsets.redDot, 130, 200),
        min: 0,
        max: 200,
        unit: '',
      },
      {
        key: 'ff-2x',
        label: '2x Scope',
        category: 'general',
        value: clamp(168 * combinedTouchScalar + offsets.scope2x, 120, 200),
        min: 0,
        max: 200,
        unit: '',
      },
      {
        key: 'ff-4x',
        label: '4x Scope',
        category: 'general',
        value: clamp(154 * combinedTouchScalar + offsets.scope4x, 100, 200),
        min: 0,
        max: 200,
        unit: '',
      },
      {
        key: 'ff-sniper',
        label: 'Sniper Scope',
        category: 'general',
        value: clamp(96 * combinedTouchScalar + offsets.sniper, 60, 160),
        min: 0,
        max: 200,
        unit: '',
      },
      {
        key: 'ff-free-look',
        label: 'Free Look',
        category: 'general',
        value: clamp(118 * combinedTouchScalar + offsets.freeLook, 75, 180),
        min: 0,
        max: 200,
        unit: '',
      },
    ];

    const sliders = rawSliders.map((item) =>
      overrides && typeof overrides[item.key] === 'number'
        ? { ...item, value: clamp(overrides[item.key], item.min, item.max) }
        : item
    );

    const hardwareTips = buildFreeFireHardwareTips(input);
    const shareCode = buildShareCode(input, sliders);
    const result: CalibrationResult = {
      game: 'free-fire',
      gameLabel: 'Garena Free Fire',
      scaleMax: 200,
      sliders,
      hardwareTips,
      shareCode,
      summaryText: '',
    };
    result.summaryText = formatSummaryForClipboard(result, input);
    return result;
  }

  const style = getPubgPlaystyleFactor(input.playstyle);
  const camPrefScalar = getCameraPrefScalar(input.cameraPref);
  const gyroTouchReduction =
    input.gyro === 'always-on' ? 0.92 : input.gyro === 'scope-on' ? 0.96 : 1.05;
  const touchBase = combinedTouchScalar * gyroTouchReduction * camPrefScalar;

  const freeLookSliders: SensitivitySliderItem[] = [
    {
      key: 'fl-tpp-char',
      label: 'TPP Character / Vehicle',
      category: 'free-look',
      value: clamp(115 * combinedTouchScalar * style.cam * camPrefScalar, 50, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'fl-camera',
      label: 'Camera (Parachuting)',
      category: 'free-look',
      value: clamp(110 * combinedTouchScalar * style.cam * camPrefScalar, 50, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'fl-fpp-char',
      label: 'FPP Character',
      category: 'free-look',
      value: clamp(92 * combinedTouchScalar * style.cam * camPrefScalar, 40, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
  ];

  const camSliders: SensitivitySliderItem[] = [
    {
      key: 'cam-tpp',
      label: '3rd Person (TPP) No Scope',
      category: 'camera',
      value: clamp(122 * touchBase * style.cam, 50, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'cam-fpp',
      label: '1st Person (FPP) No Scope',
      category: 'camera',
      value: clamp(106 * touchBase * style.cam, 45, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'cam-red-dot',
      label: 'Red Dot, Holo, Aim Assist',
      category: 'camera',
      value: clamp(55 * touchBase * style.cam, 20, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'cam-2x',
      label: '2x Scope',
      category: 'camera',
      value: clamp(36 * touchBase * style.cam, 15, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'cam-3x',
      label: '3x Scope, Win94',
      category: 'camera',
      value: clamp(26 * touchBase * style.cam, 12, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'cam-4x',
      label: '4x Scope, VSS',
      category: 'camera',
      value: clamp(18 * touchBase * style.sniper, 8, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'cam-6x',
      label: '6x Scope',
      category: 'camera',
      value: clamp(13 * touchBase * style.sniper, 6, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'cam-8x',
      label: '8x Scope',
      category: 'camera',
      value: clamp(10 * touchBase * style.sniper, 4, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
  ];

  const adsNonGyroBoost = input.gyro === 'off' ? 1.15 : input.gyro === 'scope-on' ? 0.98 : 0.94;
  const adsSliders: SensitivitySliderItem[] = [
    {
      key: 'ads-tpp',
      label: '3rd Person (TPP) No Scope',
      category: 'ads',
      value: clamp(116 * combinedTouchScalar * adsNonGyroBoost * style.ads, 45, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'ads-fpp',
      label: '1st Person (FPP) No Scope',
      category: 'ads',
      value: clamp(104 * combinedTouchScalar * adsNonGyroBoost * style.ads, 40, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'ads-red-dot',
      label: 'Red Dot, Holo, Aim Assist',
      category: 'ads',
      value: clamp(54 * combinedTouchScalar * adsNonGyroBoost * style.ads, 20, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'ads-2x',
      label: '2x Scope',
      category: 'ads',
      value: clamp(38 * combinedTouchScalar * adsNonGyroBoost * style.ads, 15, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'ads-3x',
      label: '3x Scope, Win94',
      category: 'ads',
      value: clamp(29 * combinedTouchScalar * adsNonGyroBoost * style.ads, 12, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'ads-4x',
      label: '4x Scope, VSS',
      category: 'ads',
      value: clamp(20 * combinedTouchScalar * adsNonGyroBoost * style.sniper, 8, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'ads-6x',
      label: '6x Scope',
      category: 'ads',
      value: clamp(14 * combinedTouchScalar * adsNonGyroBoost * style.sniper, 6, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
    {
      key: 'ads-8x',
      label: '8x Scope',
      category: 'ads',
      value: clamp(12 * combinedTouchScalar * adsNonGyroBoost * style.sniper, 5, 300),
      min: 1,
      max: 300,
      unit: '%',
    },
  ];

  const gyroDeviceScale =
    input.device.screenInches >= 9.0 ? 0.8 : input.device.os === 'iOS' ? 0.98 : 1.02;
  const gyroBase = gyroDeviceScale * refreshFactor * style.gyro;

  const gyroSliders: SensitivitySliderItem[] =
    input.gyro === 'off'
      ? []
      : [
          {
            key: 'gyro-tpp',
            label: '3rd Person (TPP) No Scope',
            category: 'gyro',
            value: clamp(335 * gyroBase, 180, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'gyro-fpp',
            label: '1st Person (FPP) No Scope',
            category: 'gyro',
            value: clamp(325 * gyroBase, 170, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'gyro-red-dot',
            label: 'Red Dot, Holo, Aim Assist',
            category: 'gyro',
            value: clamp(355 * gyroBase, 180, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'gyro-2x',
            label: '2x Scope',
            category: 'gyro',
            value: clamp(325 * gyroBase, 150, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'gyro-3x',
            label: '3x Scope, Win94',
            category: 'gyro',
            value: clamp(265 * gyroBase, 120, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'gyro-4x',
            label: '4x Scope, VSS',
            category: 'gyro',
            value: clamp(220 * gyroBase * style.sniper, 100, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'gyro-6x',
            label: '6x Scope',
            category: 'gyro',
            value: clamp(112 * gyroBase * style.sniper, 55, 260),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'gyro-8x',
            label: '8x Scope',
            category: 'gyro',
            value: clamp(85 * gyroBase * style.sniper, 40, 200),
            min: 1,
            max: 400,
            unit: '%',
          },
        ];

  const adsGyroSliders: SensitivitySliderItem[] =
    input.gyro === 'off'
      ? []
      : [
          {
            key: 'ads-gyro-tpp',
            label: '3rd Person (TPP) No Scope',
            category: 'ads-gyro',
            value: clamp(340 * gyroBase, 180, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'ads-gyro-fpp',
            label: '1st Person (FPP) No Scope',
            category: 'ads-gyro',
            value: clamp(330 * gyroBase, 170, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'ads-gyro-red-dot',
            label: 'Red Dot, Holo, Aim Assist',
            category: 'ads-gyro',
            value: clamp(365 * gyroBase, 190, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'ads-gyro-2x',
            label: '2x Scope',
            category: 'ads-gyro',
            value: clamp(335 * gyroBase, 160, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'ads-gyro-3x',
            label: '3x Scope, Win94',
            category: 'ads-gyro',
            value: clamp(275 * gyroBase, 130, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'ads-gyro-4x',
            label: '4x Scope, VSS',
            category: 'ads-gyro',
            value: clamp(235 * gyroBase * style.sniper, 110, 400),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'ads-gyro-6x',
            label: '6x Scope',
            category: 'ads-gyro',
            value: clamp(118 * gyroBase * style.sniper, 60, 260),
            min: 1,
            max: 400,
            unit: '%',
          },
          {
            key: 'ads-gyro-8x',
            label: '8x Scope',
            category: 'ads-gyro',
            value: clamp(90 * gyroBase * style.sniper, 45, 200),
            min: 1,
            max: 400,
            unit: '%',
          },
        ];

  const combined = [
    ...camSliders,
    ...adsSliders,
    ...gyroSliders,
    ...adsGyroSliders,
    ...freeLookSliders,
  ].map((item) =>
    overrides && typeof overrides[item.key] === 'number'
      ? { ...item, value: clamp(overrides[item.key], item.min, item.max) }
      : item
  );

  const hardwareTips = buildPubgHardwareTips(input);
  const shareCode = buildShareCode(input, combined);

  const result: CalibrationResult = {
    game: 'pubg-bgmi',
    gameLabel: 'BGMI (Battlegrounds Mobile India)',
    scaleMax: 400,
    sliders: combined,
    hardwareTips,
    shareCode,
    summaryText: '',
  };
  result.summaryText = formatSummaryForClipboard(result, input);
  return result;
}
