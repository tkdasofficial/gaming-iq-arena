import { useState } from 'react';
import { Check, Crosshair, RotateCcw } from 'lucide-react';
import type {
  BrandRecord,
  CalibrationInput,
  CalibrationResult,
  CameraPref,
  ClawStyle,
  DeviceProfile,
  GameId,
  GyroMode,
  Playstyle,
} from '../engine/types';
import freeFireImage from '@/assets/images/free_fire_tactical_1794913202193.jpg';
import pubgImage from '@/assets/images/pubg_bgmi_tactical_1794913203740.jpg';
import { DeviceInfoSection } from './DeviceInfoSection';
import { GameplayPreferencesSection } from './GameplayPreferencesSection';
import { SensitivityResultsSection } from './SensitivityResultsSection';

interface CalibrateViewProps {
  input: CalibrationInput;
  result: CalibrationResult;
  brands: BrandRecord[];
  brandsLoading: boolean;
  brandsError: string | null;
  selectedBrandId: string;
  brandModels: DeviceProfile[];
  devicesLoadingBrand: string | null;
  devicesError: string | null;
  hasGenerated: boolean;
  isGenerating: boolean;
  hasOverrides: boolean;
  isManualMode: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  deviceSavedToast: boolean;
  copiedAll: boolean;
  validationErrors: { brand?: string; model?: string; screenInches?: string };
  onChangeGame: (game: GameId) => void;
  onSelectBrandId: (brandId: string) => void;
  onSelectModelId: (modelId: string) => void;
  onToggleManualMode: (manual: boolean) => void;
  onUpdateDeviceField: <K extends keyof DeviceProfile>(
    key: K,
    value: DeviceProfile[K]
  ) => void;
  onOpenCatalogModal: () => void;
  onSaveDeviceToCloud: () => void;
  onRetryDatabase: () => void;
  onOpenAdminSync: () => void;
  onChangeClaw: (claw: ClawStyle) => void;
  onChangePlaystyle: (playstyle: Playstyle) => void;
  onChangeGyro: (gyro: GyroMode) => void;
  onChangePreferredFps: (fps: string) => void;
  onChangeFireButtonSize: (size: number) => void;
  onChangeDpiOverride: (dpi: string) => void;
  onChangeCameraPref: (pref: CameraPref) => void;
  onChangeCurrentSensitivity: (val: string) => void;
  onGenerate: () => void;
  onResetAll: () => void;
  onSliderChange: (key: string, value: number) => void;
  onCopyAll: () => void;
  onCopyText: (text: string) => void;
  onRegenerate: () => void;
  onSaveProfile: (name: string) => Promise<void>;
  onPublishPreset: (details: {
    name: string;
    playerArchetype: string;
    description: string;
  }) => Promise<void>;
  onRequestSignIn: () => void;
}

interface GameCatalogItem {
  id: GameId;
  name: string;
  imageSrc: string;
  comingSoon?: boolean;
}

const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: 'free-fire',
    name: 'Garena Free Fire',
    imageSrc: freeFireImage,
  },
  {
    id: 'pubg-bgmi',
    name: 'BGMI (Battlegrounds Mobile India)',
    imageSrc: pubgImage,
  },
];

export function CalibrateView({
  input,
  result,
  brands,
  brandsLoading,
  brandsError,
  selectedBrandId,
  brandModels,
  devicesLoadingBrand,
  devicesError,
  hasGenerated,
  isGenerating,
  hasOverrides,
  isManualMode,
  isSignedIn,
  isAdmin,
  deviceSavedToast,
  copiedAll,
  validationErrors,
  onChangeGame,
  onSelectBrandId,
  onSelectModelId,
  onToggleManualMode,
  onUpdateDeviceField,
  onOpenCatalogModal,
  onSaveDeviceToCloud,
  onRetryDatabase,
  onOpenAdminSync,
  onChangeClaw,
  onChangePlaystyle,
  onChangeGyro,
  onChangePreferredFps,
  onChangeFireButtonSize,
  onChangeDpiOverride,
  onChangeCameraPref,
  onChangeCurrentSensitivity,
  onGenerate,
  onResetAll,
  onSliderChange,
  onCopyAll,
  onCopyText,
  onRegenerate,
  onSaveProfile,
  onPublishPreset,
  onRequestSignIn,
}: CalibrateViewProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-5 md:space-y-6">
      {/* 1. Compact Header & Horizontal Game Selection */}
      <section aria-labelledby="game-select-heading" className="space-y-3">
        <h1
          id="game-select-heading"
          className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
        >
          Select Game
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          {GAME_CATALOG.map((card) => {
            const isActive = input.game === card.id;
            const imgFailed = failedImages[card.id];
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onChangeGame(card.id)}
                aria-pressed={isActive}
                className={`group relative overflow-hidden rounded-xl border text-left w-full min-w-0 h-[80px] sm:h-[92px] p-3.5 sm:p-4 flex items-end justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0263C] ${
                  isActive
                    ? 'border-[#F0263C] bg-[#1B1B20]'
                    : 'border-[#29292F] bg-[#141417] hover:border-[#3F3F46]'
                }`}
              >
                {!imgFailed ? (
                  <img
                    src={card.imageSrc}
                    alt={card.name}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [card.id]: true }))
                    }
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                      isActive ? 'opacity-45' : 'opacity-20 group-hover:opacity-35'
                    }`}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-br from-[#1B1B20] to-[#0B0B0D]"
                  />
                )}
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 ${
                    isActive
                      ? 'bg-gradient-to-t from-[#0B0B0D] via-[#0B0B0D]/70 to-[#F0263C]/10'
                      : 'bg-gradient-to-t from-[#0B0B0D] via-[#0B0B0D]/80 to-transparent'
                  }`}
                />

                <div className="relative z-10 min-w-0">
                  <div className="font-display text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                    {card.name}
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className={`relative z-10 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                    isActive
                      ? 'bg-[#F0263C] border-[#F0263C] text-white'
                      : 'bg-[#111114]/80 border-[#29292F] text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Device Information */}
      <DeviceInfoSection
        game={input.game}
        device={input.device}
        brands={brands}
        brandsLoading={brandsLoading}
        brandsError={brandsError}
        selectedBrandId={selectedBrandId}
        brandModels={brandModels}
        devicesLoadingBrand={devicesLoadingBrand}
        devicesError={devicesError}
        isManualMode={isManualMode}
        isSignedIn={isSignedIn}
        isAdmin={isAdmin}
        deviceSavedToast={deviceSavedToast}
        validationErrors={validationErrors}
        onSelectBrandId={onSelectBrandId}
        onSelectModelId={onSelectModelId}
        onToggleManualMode={onToggleManualMode}
        onUpdateDeviceField={onUpdateDeviceField}
        onOpenCatalogModal={onOpenCatalogModal}
        onSaveDeviceToCloud={onSaveDeviceToCloud}
        onRetryDatabase={onRetryDatabase}
        onOpenAdminSync={onOpenAdminSync}
      />

      {/* 3. Gameplay Preferences */}
      <GameplayPreferencesSection
        input={input}
        onChangeClaw={onChangeClaw}
        onChangePlaystyle={onChangePlaystyle}
        onChangeGyro={onChangeGyro}
        onChangePreferredFps={onChangePreferredFps}
        onChangeFireButtonSize={onChangeFireButtonSize}
        onChangeDpiOverride={onChangeDpiOverride}
        onChangeCameraPref={onChangeCameraPref}
        onChangeCurrentSensitivity={onChangeCurrentSensitivity}
      />

      {/* 4. Primary Action */}
      <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 pt-1">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full md:w-auto md:min-w-[300px] min-h-[52px] px-7 rounded-xl bg-[#F0263C] hover:bg-[#D81E34] active:bg-[#B8172A] active:scale-[0.99] disabled:opacity-70 text-white text-sm font-bold tracking-wider inline-flex items-center justify-center gap-2.5 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Crosshair className="w-4 h-4" />
          <span>
            {isGenerating ? 'GENERATING PROFILE...' : 'GENERATE MY SENSITIVITY'}
          </span>
        </button>

        <button
          type="button"
          onClick={onResetAll}
          className="w-full sm:w-auto min-h-[48px] px-4 rounded-xl bg-transparent hover:bg-[#141417] text-[#71717A] hover:text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* 5. Sensitivity Results */}
      <SensitivityResultsSection
        input={input}
        result={result}
        hasGenerated={hasGenerated}
        isGenerating={isGenerating}
        hasOverrides={hasOverrides}
        copiedAll={copiedAll}
        isSignedIn={isSignedIn}
        onSliderChange={onSliderChange}
        onCopyAll={onCopyAll}
        onCopyText={onCopyText}
        onRegenerate={onRegenerate}
        onSaveProfile={onSaveProfile}
        onPublishPreset={onPublishPreset}
        onRequestSignIn={onRequestSignIn}
      />
    </div>
  );
}
