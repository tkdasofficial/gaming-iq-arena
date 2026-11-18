import { useEffect, useMemo, useState } from 'react';
import { AdminDbSyncModal } from './AdminDbSyncModal';
import { AimLabView } from './AimLabView';
import { BottomNav } from './BottomNav';
import { CalibrateView } from './CalibrateView';
import { DevicePickerModal } from './DevicePickerModal';
import { PresetsView } from './PresetsView';
import { SavedView } from './SavedView';
import { TopNav, type NavTab } from './TopNav';
import { calculateSensitivity, formatSummaryForClipboard } from '../engine/calculator';
import {
  createBlankDeviceProfile,
  formatDeviceFullName,
  getSupportedFpsOptions,
} from '../engine/devices';
import type {
  CalibrationInput,
  CameraPref,
  ClawStyle,
  DeviceProfile,
  GameId,
  GyroMode,
  Playstyle,
  ProPreset,
  SavedSetup,
} from '../engine/types';
import { enrichDeviceProfile } from '../firebase/deviceDatabase';
import { useFirebase } from '../firebase/FirebaseContext';
import {
  createAimLabRun,
  createSavedSetup,
  publishPreset,
  removeAimLabRun,
  removeCustomDevice,
  removePreset,
  removeSavedSetup,
  saveCustomDevice,
} from '../firebase/services';

function createInitialInput(): CalibrationInput {
  const blankDevice = createBlankDeviceProfile();
  return {
    game: 'free-fire',
    device: blankDevice,
    claw: '2-finger',
    playstyle: 'headshot-focus',
    gyro: 'off',
    preferredFps: '90 FPS',
    fireButtonSize: 46,
    dpiOverride: '',
    cameraPref: 'medium',
    currentSensitivity: '',
  };
}

export default function App() {
  const {
    user,
    authReady,
    isAdmin,
    authError,
    signingIn,
    savedSetups,
    customDevices,
    brands,
    brandsLoading,
    brandsError,
    brandDevices,
    devicesLoadingBrand,
    devicesError,
    catalogDevices,
    catalogLoading,
    aimLabRuns,
    publicPresets,
    presetsLoaded,
    loadBrandDevices,
    loadCatalogDevices,
    refreshDeviceDatabase,
    signInWithGoogle,
    signOutUser,
    clearAuthError,
  } = useFirebase();

  const autostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [activeTab, setActiveTab] = useState<NavTab>('calibrate');
  const [input, setInput] = useState<CalibrationInput>(createInitialInput);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [hasGenerated, setHasGenerated] = useState<boolean>(autostart);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isManualMode, setIsManualMode] = useState(true);
  const [deviceSavedToast, setDeviceSavedToast] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    brand?: string;
    model?: string;
    screenInches?: string;
  }>({});
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [adminSyncOpen, setAdminSyncOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const brandModels = useMemo(
    () => (selectedBrandId ? brandDevices[selectedBrandId] ?? [] : []),
    [brandDevices, selectedBrandId]
  );

  // Initialize first brand from Firestore once brands load
  useEffect(() => {
    if (brandsLoading || brands.length === 0) return;
    if (!selectedBrandId) {
      const preferredBrand =
        brands.find((b) => b.id === 'samsung') ?? brands[0];
      setSelectedBrandId(preferredBrand.id);
      void loadBrandDevices(preferredBrand.id);
    }
  }, [brands, brandsLoading, selectedBrandId, loadBrandDevices]);

  // Pre-select the newest smartphone model when Firestore catalog initializes and device is still blank
  useEffect(() => {
    if (
      brands.length > 0 &&
      brandModels.length > 0 &&
      !input.device.brand.trim() &&
      !input.device.model.trim()
    ) {
      const first = brandModels[0];
      setIsManualMode(false);
      const supported = getSupportedFpsOptions(first, input.game);
      setInput((prev) => ({
        ...prev,
        device: first,
        preferredFps: supported[supported.length - 1],
      }));
      void enrichDeviceProfile(first).then((enriched) => {
        const nextSupported = getSupportedFpsOptions(enriched, input.game);
        setInput((prev) =>
          prev.device.id === enriched.id
            ? {
                ...prev,
                device: enriched,
                preferredFps: nextSupported[nextSupported.length - 1],
              }
            : prev
        );
      });
    }
  }, [brands.length, brandModels, input.device.brand, input.device.model, input.game]);

  const result = useMemo(
    () => calculateSensitivity(input, overrides),
    [input, overrides]
  );

  const hasOverrides = Object.keys(overrides).length > 0;

  const copyTextToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const applyEnrichedDevice = async (baseDevice: DeviceProfile, game: GameId) => {
    const supported = getSupportedFpsOptions(baseDevice, game);
    setInput((prev) => ({
      ...prev,
      device: baseDevice,
      preferredFps: supported[supported.length - 1],
    }));
    const enriched = await enrichDeviceProfile(baseDevice);
    const enrichedSupported = getSupportedFpsOptions(enriched, game);
    setInput((prev) =>
      prev.device.id === enriched.id
        ? {
            ...prev,
            device: enriched,
            preferredFps: enrichedSupported[enrichedSupported.length - 1],
          }
        : prev
    );
  };

  const handleChangeGame = (game: GameId) => {
    setInput((prev) => {
      const supported = getSupportedFpsOptions(prev.device, game);
      return {
        ...prev,
        game,
        gyro: game === 'pubg-bgmi' && prev.gyro === 'off' ? 'always-on' : prev.gyro,
        claw: game === 'pubg-bgmi' && prev.claw === '2-finger' ? '4-finger' : prev.claw,
        playstyle: game === 'free-fire' ? 'headshot-focus' : 'balanced',
        preferredFps: supported[supported.length - 1],
      };
    });
    setOverrides({});
  };

  const handleSelectBrandId = async (brandId: string) => {
    setSelectedBrandId(brandId);
    setValidationErrors({});
    setOverrides({});
    const models = await loadBrandDevices(brandId);
    if (models.length > 0) {
      await applyEnrichedDevice(models[0], input.game);
    }
  };

  const handleSelectModelId = async (modelId: string) => {
    const found = brandModels.find((d) => d.id === modelId);
    if (!found) return;
    setValidationErrors({});
    setOverrides({});
    await applyEnrichedDevice(found, input.game);
  };

  const handleToggleManualMode = (manual: boolean) => {
    setIsManualMode(manual);
    if (manual) {
      setInput((prev) => ({
        ...prev,
        device: {
          ...prev.device,
          id: 'manual-device',
        },
      }));
    } else if (brandModels.length > 0) {
      void applyEnrichedDevice(brandModels[0], input.game);
      setValidationErrors({});
    } else if (brands.length > 0) {
      const targetBrand = selectedBrandId || brands[0].id;
      setSelectedBrandId(targetBrand);
      void loadBrandDevices(targetBrand).then((models) => {
        if (models.length > 0) {
          void applyEnrichedDevice(models[0], input.game);
        }
      });
      setValidationErrors({});
    }
  };

  const handleUpdateDeviceField = <K extends keyof DeviceProfile>(
    key: K,
    value: DeviceProfile[K]
  ) => {
    setInput((prev) => ({
      ...prev,
      device: {
        ...prev.device,
        [key]: value,
      },
    }));
    setValidationErrors((prev) => ({ ...prev, [key]: undefined }));
    setOverrides({});
  };

  const handleOpenCatalogModal = () => {
    setDeviceModalOpen(true);
    if (catalogDevices.length === 0) {
      void loadCatalogDevices();
    }
  };

  const handleSelectDevice = (device: DeviceProfile) => {
    const isCustom =
      device.id === 'custom-device' ||
      device.id === 'manual-device' ||
      brands.length === 0 ||
      customDevices.some((cd) => cd.id === device.id);
    setIsManualMode(isCustom);
    if (device.brandId) {
      setSelectedBrandId(device.brandId);
      if (!brandDevices[device.brandId]) {
        void loadBrandDevices(device.brandId);
      }
    }
    setValidationErrors({});
    setOverrides({});
    if (!isCustom) {
      void applyEnrichedDevice(device, input.game);
    } else {
      const supported = getSupportedFpsOptions(device, input.game);
      setInput((prev) => ({
        ...prev,
        device,
        preferredFps: supported[supported.length - 1],
      }));
    }
  };

  const validateInputs = (): boolean => {
    const errors: { brand?: string; model?: string; screenInches?: string } = {};
    if (!input.device.brand.trim()) {
      errors.brand = 'Device brand is required';
    }
    if (!input.device.model.trim()) {
      errors.model = 'Device model is required';
    }
    if (
      !input.device.screenInches ||
      input.device.screenInches < 4.5 ||
      input.device.screenInches > 14
    ) {
      errors.screenInches = 'Enter 4.5–14.0 in';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDeviceToCloud = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (!validateInputs()) return;
    const savedId = await saveCustomDevice(user.uid, input.device);
    setInput((prev) => ({
      ...prev,
      device: { ...prev.device, id: savedId },
    }));
    setDeviceSavedToast(true);
    window.setTimeout(() => setDeviceSavedToast(false), 2000);
  };

  const handleSaveModalCustomDevice = async (device: DeviceProfile) => {
    if (!user) return;
    await saveCustomDevice(user.uid, device);
  };

  const handleDeleteCustomDevice = async (deviceId: string) => {
    if (!user) return;
    await removeCustomDevice(user.uid, deviceId);
  };

  const handleGenerate = () => {
    if (!validateInputs()) return;
    setIsGenerating(true);
    window.setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    }, 180);
  };

  const handleRegenerate = () => {
    if (!validateInputs()) return;
    setOverrides({});
    setIsGenerating(true);
    window.setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    }, 180);
  };

  const handleResetAll = () => {
    setIsManualMode(brands.length === 0);
    const fresh = createInitialInput();
    if (brandModels.length > 0) {
      fresh.device = brandModels[0];
      const supported = getSupportedFpsOptions(brandModels[0], fresh.game);
      fresh.preferredFps = supported[supported.length - 1];
    }
    setInput(fresh);
    setOverrides({});
    setValidationErrors({});
    setHasGenerated(false);
  };

  const handleSliderChange = (key: string, value: number) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async (name: string) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    const sliderMap: Record<string, number> = {};
    for (const s of result.sliders) {
      sliderMap[s.key] = s.value;
    }
    await createSavedSetup(user.uid, name, input, sliderMap);
  };

  const handlePublishPreset = async (details: {
    name: string;
    playerArchetype: string;
    description: string;
  }) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    const sliderMap: Record<string, number> = {};
    for (const s of result.sliders) {
      sliderMap[s.key] = s.value;
    }
    const topSliders = result.sliders
      .slice(0, 2)
      .map((s) => `${s.label.split(' ')[0]} ${s.value}${s.unit}`)
      .join(' · ');

    await publishPreset(user, {
      name: details.name,
      playerArchetype: details.playerArchetype,
      description: details.description,
      headlineMetric: topSliders,
      input,
      sliders: sliderMap,
    });
  };

  const handleApplyPreset = (preset: ProPreset) => {
    const supported = getSupportedFpsOptions(preset.device, preset.game);
    setIsManualMode(true);
    setValidationErrors({});
    setInput({
      game: preset.game,
      device: preset.device,
      claw: preset.claw,
      playstyle: preset.playstyle,
      gyro: preset.gyro,
      preferredFps: supported[supported.length - 1],
      fireButtonSize: 46,
      cameraPref: 'medium',
    });
    setOverrides(preset.sliderOverrides ? { ...preset.sliderOverrides } : {});
    setHasGenerated(true);
    setActiveTab('calibrate');
  };

  const handleLoadSetup = (setup: SavedSetup) => {
    setInput(setup.input);
    setOverrides({ ...setup.sliders });
    setHasGenerated(true);
    setActiveTab('calibrate');
  };

  const handleDeleteSetup = async (id: string) => {
    if (!user) return;
    await removeSavedSetup(user.uid, id);
  };

  const handleCopySavedSetup = (setup: SavedSetup) => {
    const computed = calculateSensitivity(setup.input, setup.sliders);
    copyTextToClipboard(formatSummaryForClipboard(computed, setup.input));
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white flex flex-col">
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onCopySetup={() => copyTextToClipboard(result.summaryText)}
        copied={copied}
        savedCount={savedSetups.length}
        user={user}
        authReady={authReady}
        signingIn={signingIn}
        onSignIn={() => void signInWithGoogle()}
        onSignOut={() => void signOutUser()}
      />

      {authError ? (
        <div className="max-w-5xl w-full mx-auto px-4 md:px-6 pt-3">
          <div className="p-3 rounded-xl bg-[#1B1B20] border border-[#F0263C] text-xs text-white flex items-center justify-between gap-3">
            <span>{authError}</span>
            <button
              type="button"
              onClick={clearAuthError}
              className="text-[#F0263C] font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pt-5 md:pt-7 pb-24 md:pb-12">
        {activeTab === 'calibrate' ? (
          <CalibrateView
            input={input}
            result={result}
            brands={brands}
            brandsLoading={brandsLoading}
            brandsError={brandsError}
            selectedBrandId={selectedBrandId}
            brandModels={brandModels}
            devicesLoadingBrand={devicesLoadingBrand}
            devicesError={devicesError}
            hasGenerated={hasGenerated}
            isGenerating={isGenerating}
            hasOverrides={hasOverrides}
            isManualMode={isManualMode}
            isSignedIn={Boolean(user)}
            isAdmin={isAdmin}
            deviceSavedToast={deviceSavedToast}
            copiedAll={copied}
            validationErrors={validationErrors}
            onChangeGame={handleChangeGame}
            onSelectBrandId={(brandId) => void handleSelectBrandId(brandId)}
            onSelectModelId={(modelId) => void handleSelectModelId(modelId)}
            onToggleManualMode={handleToggleManualMode}
            onUpdateDeviceField={handleUpdateDeviceField}
            onOpenCatalogModal={handleOpenCatalogModal}
            onSaveDeviceToCloud={() => void handleSaveDeviceToCloud()}
            onRetryDatabase={() => void refreshDeviceDatabase()}
            onOpenAdminSync={() => setAdminSyncOpen(true)}
            onChangeClaw={(claw: ClawStyle) => {
              setInput((prev) => ({ ...prev, claw }));
              setOverrides({});
            }}
            onChangePlaystyle={(playstyle: Playstyle) => {
              setInput((prev) => ({ ...prev, playstyle }));
              setOverrides({});
            }}
            onChangeGyro={(gyro: GyroMode) => {
              setInput((prev) => ({ ...prev, gyro }));
              setOverrides({});
            }}
            onChangePreferredFps={(preferredFps: string) =>
              setInput((prev) => ({ ...prev, preferredFps }))
            }
            onChangeFireButtonSize={(fireButtonSize: number) =>
              setInput((prev) => ({ ...prev, fireButtonSize }))
            }
            onChangeDpiOverride={(dpiOverride: string) =>
              setInput((prev) => ({ ...prev, dpiOverride }))
            }
            onChangeCameraPref={(cameraPref: CameraPref) => {
              setInput((prev) => ({ ...prev, cameraPref }));
              setOverrides({});
            }}
            onChangeCurrentSensitivity={(currentSensitivity: string) =>
              setInput((prev) => ({ ...prev, currentSensitivity }))
            }
            onGenerate={handleGenerate}
            onResetAll={handleResetAll}
            onSliderChange={handleSliderChange}
            onCopyAll={() => copyTextToClipboard(result.summaryText)}
            onCopyText={copyTextToClipboard}
            onRegenerate={handleRegenerate}
            onSaveProfile={handleSaveProfile}
            onPublishPreset={handlePublishPreset}
            onRequestSignIn={() => void signInWithGoogle()}
          />
        ) : null}

        {activeTab === 'presets' ? (
          <PresetsView
            presets={publicPresets}
            loaded={presetsLoaded}
            currentUserId={user?.uid ?? null}
            isAdmin={isAdmin}
            onApplyPreset={handleApplyPreset}
            onDeletePreset={removePreset}
            onGoToCalibrate={() => setActiveTab('calibrate')}
            onRequestSignIn={() => void signInWithGoogle()}
          />
        ) : null}

        {activeTab === 'aim-lab' ? (
          <AimLabView
            result={result}
            isSignedIn={Boolean(user)}
            aimLabRuns={aimLabRuns}
            onSaveRun={async (run) => {
              if (!user) return;
              await createAimLabRun(user.uid, run);
            }}
            onDeleteRun={async (runId) => {
              if (!user) return;
              await removeAimLabRun(user.uid, runId);
            }}
            onSignIn={() => void signInWithGoogle()}
          />
        ) : null}

        {activeTab === 'saved' ? (
          <SavedView
            savedSetups={savedSetups}
            isSignedIn={Boolean(user)}
            authReady={authReady}
            onSignIn={() => void signInWithGoogle()}
            onLoadSetup={handleLoadSetup}
            onDeleteSetup={handleDeleteSetup}
            onCopySetupObject={handleCopySavedSetup}
            onGoToCalibrate={() => setActiveTab('calibrate')}
          />
        ) : null}
      </main>

      <footer className="hidden md:block border-t border-[#29292F] py-5">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-[#71717A]">
          <span>Gaming IQ · Sensitivity Calibration Platform</span>
          <span>
            {input.device.model
              ? `${formatDeviceFullName(input.device.brand, input.device.model)} · `
              : ''}
            Garena Free Fire · BGMI
          </span>
        </div>
      </footer>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        savedCount={savedSetups.length}
      />

      <DevicePickerModal
        isOpen={deviceModalOpen}
        selectedDevice={input.device}
        brands={brands}
        catalogDevices={catalogDevices}
        catalogLoading={catalogLoading}
        customDevices={customDevices}
        isSignedIn={Boolean(user)}
        onSelect={handleSelectDevice}
        onSaveCustomDevice={handleSaveModalCustomDevice}
        onDeleteCustomDevice={handleDeleteCustomDevice}
        onClose={() => setDeviceModalOpen(false)}
      />

      <AdminDbSyncModal
        isOpen={adminSyncOpen}
        onClose={() => setAdminSyncOpen(false)}
        onSyncComplete={refreshDeviceDatabase}
      />
    </div>
  );
}
