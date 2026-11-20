/** Entry point: assembles device, player, calibration and feedback data and runs the six engines. */
import { SETTING_DB_KEY, SETTING_KEYS, modelVersionId, type ModelConfig, type SettingKey, type StaleKey } from './config';
import { buildDeviceIntelligence, type DeviceMeasurements } from './device';
import { evaluateCalibration, type CalibrationSession } from './calibration';
import { personalValue, type FeedbackEvent } from './feedback';
import { ENGINES, DEVICE_LABELS, type SettingRecommendation } from './engines';
import { EMPTY_PLAYER, isKnown, type PlayerProfile } from './player';
import { PLAYER_KEYS } from './config';
import type { IndexResult } from './indices';
import { RecommendationError, type GameRecord, type VerifiedDevice } from '../recommend';

export interface IndexSummary {
  score: number | null;
  completeness: number;
  reliability: number;
  incomplete: boolean;
  components: { id: string; label: string; weight: number; quality: number | null; status: string; used: boolean }[];
}

export interface FreeFireAnalysis {
  modelVersionId: string;
  generatedAt: string;
  pi: IndexSummary;
  tdi: IndexSummary;
  settings: SettingRecommendation[];
  player: 'none' | 'partial' | 'complete';
  /** Recommendation row ids (signed-in players only), used to send feedback. */
  recommendationIds?: Partial<Record<SettingKey, string>>;
  notes: string[];
}

export interface AnalyzeInput {
  cfg: ModelConfig;
  game: GameRecord;
  device: VerifiedDevice;
  measurements: DeviceMeasurements;
  player: PlayerProfile | null;
  calibration: Partial<Record<SettingKey, CalibrationSession[]>>;
  feedback: FeedbackEvent[];
  gameVersion: string | null;
  now?: Date;
}

const summarize = (r: IndexResult): IndexSummary => ({
  score: r.score,
  completeness: r.completeness,
  reliability: r.reliability,
  incomplete: r.incomplete,
  components: r.components.map((c) => ({
    id: c.id,
    label: DEVICE_LABELS[c.id as keyof typeof DEVICE_LABELS] ?? c.id,
    weight: c.weight,
    quality: c.quality,
    status: c.status,
    used: c.used,
  })),
});

export function supportsFreeFireEngine(cfg: ModelConfig, gameId: string) {
  return cfg.gameIds.includes(gameId);
}

export function analyzeFreeFire(input: AnalyzeInput): FreeFireAnalysis {
  const { cfg, game } = input;
  if (!supportsFreeFireEngine(cfg, game.id)) throw new RecommendationError(`${game.name} is not handled by this calculator.`);
  const player = input.player ?? EMPTY_PLAYER;
  const device = buildDeviceIntelligence(input.device, input.measurements, cfg);
  const current: Partial<Record<StaleKey, string | number | null>> = {
    gameVersion: input.gameVersion,
    hudLayout: player.hudLayout,
    fireButtonSize: player.fireButtonSize,
    fireButtonPosition: player.fireButtonPosition,
    gyroStatus: player.gyroStatus,
    refreshRateHz: device.refreshRateHz,
    fpsCap: null,
    graphicsSetting: null,
  };

  const settings = SETTING_KEYS.map((key) => {
    const s = game.config.settings.find((x) => x.key === SETTING_DB_KEY[key]);
    if (!s || s.base === null) throw new RecommendationError(`${game.name} has no starting value for ${s?.label ?? key} yet.`);
    if (s.min !== cfg.slider.min || s.max !== cfg.slider.max) {
      // The configured slider range must match the game's stored range.
      throw new RecommendationError(`${game.name} slider range changed; the calculator needs a new version.`);
    }
    const prelimForTie = s.base;
    return ENGINES[key]({
      cfg,
      settingId: s.id,
      label: s.label,
      base: s.base,
      device,
      player,
      calibration: evaluateCalibration(input.calibration[key] ?? [], current, cfg.settings[key], cfg, prelimForTie),
      personal: personalValue(input.feedback, key),
    });
  });

  const known = PLAYER_KEYS.filter((k) => isKnown(player, k)).length;
  const notes: string[] = [];
  if (device.pi.score === null) notes.push('No measured in-game performance or benchmark data for this phone yet.');
  if (device.tdi.components.every((c) => c.id === 'refreshRate' || c.id === 'screenGeometry' || c.id === 'touchSampling' || !c.used)) {
    notes.push('Touch latency and consistency for this phone have not been measured yet; only advertised display specs are used.');
  }
  if (known === 0) notes.push('Answer a few questions about how you play to make these values more personal.');
  if (!settings.some((s) => s.calibrationStatus === 'calibrated')) notes.push('No in-game calibration yet, so these are preliminary starting values.');

  return {
    modelVersionId: modelVersionId(cfg),
    generatedAt: (input.now ?? new Date()).toISOString(),
    pi: summarize(device.pi),
    tdi: summarize(device.tdi),
    settings,
    player: known === 0 ? 'none' : known === PLAYER_KEYS.length ? 'complete' : 'partial',
    notes,
  };
}
