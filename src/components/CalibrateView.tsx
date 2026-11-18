import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Crosshair, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PageHeader } from './giq/primitives';
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
  publisher: string;
  imageSrc: string;
}

const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: 'free-fire',
    name: 'Free Fire',
    publisher: 'Garena',
    imageSrc: freeFireImage,
  },
  {
    id: 'pubg-bgmi',
    name: 'BGMI',
    publisher: 'Krafton',
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

  const handleGenerateClick = () => {
    const d = input.device;
    const invalidField = !d.brand.trim()
      ? 'device-brand-field'
      : !d.model.trim()
        ? 'device-model-field'
        : !d.screenInches || d.screenInches < 4.5 || d.screenInches > 14
          ? 'device-screen-size'
          : null;
    onGenerate();
    if (invalidField) {
      const el = document.getElementById(invalidField);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => el?.focus({ preventScroll: true }), 350);
      return;
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.setTimeout(() => {
        document.getElementById('generated-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 260);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Sensitivity calibrator"
        title={
          <>
            Dial in your <span className="text-gradient-primary">aim</span>
          </>
        }
        subtitle="Pick your game, confirm your phone and play style — get pro-tuned values in seconds."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="min-w-0 space-y-5">
          {/* 01 Game */}
          <section aria-label="Select game" className="grid grid-cols-2 gap-3">
            {GAME_CATALOG.map((card) => {
              const isActive = input.game === card.id;
              const imgFailed = failedImages[card.id];
              return (
                <motion.button
                  key={card.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onChangeGame(card.id)}
                  aria-pressed={isActive}
                  className={cn(
                    'group relative h-36 overflow-hidden rounded-3xl border text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-44',
                    isActive ? 'border-primary shadow-glow' : 'border-border hover:border-border-strong'
                  )}
                >
                  {!imgFailed ? (
                    <img
                      src={card.imageSrc}
                      alt=""
                      onError={() => setFailedImages((prev) => ({ ...prev, [card.id]: true }))}
                      className={cn(
                        'absolute inset-0 size-full object-cover transition-all duration-500',
                        isActive ? 'scale-105 opacity-90' : 'opacity-40 grayscale group-hover:opacity-60'
                      )}
                    />
                  ) : (
                    <div aria-hidden="true" className="absolute inset-0 bg-secondary" />
                  )}
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                  {isActive ? <div aria-hidden="true" className="absolute inset-0 bg-gradient-hero" /> : null}

                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute right-3 top-3 grid size-7 place-items-center rounded-full border transition-all duration-300',
                      isActive
                        ? 'scale-100 border-primary bg-primary text-primary-foreground'
                        : 'scale-90 border-border-strong bg-background/60 text-transparent'
                    )}
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </span>

                  <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {card.publisher}
                    </div>
                    <div className="truncate font-display text-[26px] font-extrabold leading-none tracking-tight sm:text-3xl">
                      {card.name}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </section>

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

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
            <Button variant="glow" size="xl" onClick={handleGenerateClick} disabled={isGenerating} className="w-full">
              <Crosshair className={cn(isGenerating && 'animate-spin')} />
              {isGenerating ? 'Calibrating…' : hasGenerated ? 'Recalibrate' : 'Generate sensitivity'}
            </Button>
            <Button
              variant="surface"
              size="xl"
              onClick={onResetAll}
              aria-label="Reset to defaults"
              title="Reset to defaults"
              className="w-14 px-0"
            >
              <RotateCcw />
            </Button>
          </div>
        </div>

        <div className="min-w-0 scroll-mt-20 lg:sticky lg:top-24">
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
      </div>
    </div>
  );
}
