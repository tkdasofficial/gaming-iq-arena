import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookmarkPlus,
  Calendar,
  Check,
  Cpu,
  Database,
  HardDrive,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  calculateDeviceAge,
  formatDeviceFullName,
  getGameCompatibilitySummary,
} from '../engine/devices';
import type {
  BrandRecord,
  DeviceOs,
  DeviceProfile,
  GameId,
} from '../engine/types';
import { BLUEPRINT_LIMITS } from '../firebase/validation';

interface DeviceInfoSectionProps {
  game: GameId;
  device: DeviceProfile;
  brands: BrandRecord[];
  brandsLoading: boolean;
  brandsError: string | null;
  selectedBrandId: string;
  brandModels: DeviceProfile[];
  devicesLoadingBrand: string | null;
  devicesError: string | null;
  isManualMode: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  deviceSavedToast: boolean;
  validationErrors: { brand?: string; model?: string; screenInches?: string };
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
}

const RAM_OPTIONS = [4, 6, 8, 12, 16, 24];
const STORAGE_OPTIONS = [64, 128, 256, 512, 1024, 2048];
const REFRESH_RATES = [60, 90, 120, 144, 165, 185, 240];

export function DeviceInfoSection({
  game,
  device,
  brands,
  brandsLoading,
  brandsError,
  selectedBrandId,
  brandModels,
  devicesLoadingBrand,
  devicesError,
  isManualMode,
  isSignedIn,
  isAdmin,
  deviceSavedToast,
  validationErrors,
  onSelectBrandId,
  onSelectModelId,
  onToggleManualMode,
  onUpdateDeviceField,
  onOpenCatalogModal,
  onSaveDeviceToCloud,
  onRetryDatabase,
  onOpenAdminSync,
}: DeviceInfoSectionProps) {
  const [brandQuery, setBrandQuery] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [modelLimit, setModelLimit] = useState(24);

  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.parentCompany && b.parentCompany.toLowerCase().includes(q))
    );
  }, [brands, brandQuery]);

  const filteredModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    if (!q) return brandModels;
    return brandModels.filter((m) =>
      `${m.model} ${m.modelNumber ?? ''} ${m.chipset} ${m.releaseYear ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [brandModels, modelQuery]);

  const visibleModels = filteredModels.slice(0, modelLimit);
  const compatSummary = getGameCompatibilitySummary(device, game);
  const deviceAge = calculateDeviceAge(device.releaseDate);
  const isDatabaseMode = !isManualMode && brands.length > 0;
  const isModelsLoading =
    Boolean(selectedBrandId) && devicesLoadingBrand === selectedBrandId;

  const ramOptions =
    isDatabaseMode && device.ramVariantsGb && device.ramVariantsGb.length > 0
      ? device.ramVariantsGb
      : RAM_OPTIONS;
  const storageOptions =
    isDatabaseMode && device.storageVariantsGb && device.storageVariantsGb.length > 0
      ? device.storageVariantsGb
      : STORAGE_OPTIONS;

  return (
    <section
      aria-labelledby="device-info-heading"
      className="bg-[#141417] border border-[#29292F] rounded-xl p-4 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Smartphone className="w-4 h-4 text-[#F0263C]" />
          <h2
            id="device-info-heading"
            className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight"
          >
            Device Information
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCatalogModal}
            className="min-h-[38px] px-3 rounded-lg bg-[#1B1B20] hover:bg-[#29292F] border border-[#29292F] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <span>Browse All Devices</span>
          </button>

          {brands.length > 0 ? (
            <button
              type="button"
              onClick={() => onToggleManualMode(!isManualMode)}
              className={`min-h-[38px] px-3 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                isManualMode
                  ? 'bg-[#F0263C] border-[#F0263C] text-white'
                  : 'bg-[#111114] border-[#29292F] text-[#A1A1AA] hover:text-white'
              }`}
            >
              {isManualMode ? 'Firestore Database' : 'Manual Entry'}
            </button>
          ) : null}

          {isAdmin ? (
            <button
              type="button"
              onClick={onOpenAdminSync}
              className="min-h-[38px] px-3 rounded-lg bg-[#111114] hover:bg-[#1B1B20] border border-[#29292F] hover:border-[#F0263C] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5 text-[#F0263C]" />
              <span>Admin DB Sync</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onSaveDeviceToCloud}
            className="min-h-[38px] px-3 rounded-lg bg-[#111114] hover:bg-[#1B1B20] border border-[#29292F] hover:border-[#F0263C] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            {deviceSavedToast ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#F0263C]" />
                <span>Saved to Cloud</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5 text-[#F0263C]" />
                <span>{isSignedIn ? 'Save Device' : 'Sign In to Save'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading / Error / Empty Database Banners */}
      {brandsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-live="polite">
          <div className="h-11 rounded-lg bg-[#1B1B20] border border-[#29292F] animate-pulse" />
          <div className="h-11 rounded-lg bg-[#1B1B20] border border-[#29292F] animate-pulse" />
        </div>
      ) : brandsError || devicesError ? (
        <div className="p-3.5 rounded-xl bg-[#111114] border border-[#F0263C]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#A1A1AA]">
            <AlertTriangle className="w-4 h-4 text-[#F0263C] shrink-0" />
            <span>
              Unable to load Cloud Firestore smartphone catalog. You can retry or enter specs manually.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRetryDatabase}
              className="min-h-[34px] px-3 rounded-lg bg-[#1B1B20] border border-[#29292F] text-white font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleManualMode(true)}
              className="min-h-[34px] px-3 rounded-lg bg-[#F0263C] text-white font-semibold"
            >
              Manual Entry
            </button>
          </div>
        </div>
      ) : brands.length === 0 ? (
        <div className="p-3.5 rounded-xl bg-[#111114] border border-[#29292F] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-[#A1A1AA]">
            Cloud Firestore device catalog has no synced models yet. Enter your device specs manually below
            {isAdmin ? ' or sync the backend dataset.' : '.'}
          </div>
          {isAdmin ? (
            <button
              type="button"
              onClick={onOpenAdminSync}
              className="min-h-[34px] px-3 rounded-lg bg-[#F0263C] text-white font-semibold inline-flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Sync Firestore Catalog</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Firestore Database Selectors OR Manual Entry Inputs */}
      {isDatabaseMode ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Searchable Brand Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="device-brand-search"
                  className="text-xs font-medium text-[#A1A1AA]"
                >
                  Brand ({brands.length})
                </label>
                {brandQuery ? (
                  <button
                    type="button"
                    onClick={() => setBrandQuery('')}
                    className="text-[11px] text-[#71717A] hover:text-white"
                  >
                    Clear filter
                  </button>
                ) : null}
              </div>
              <input
                id="device-brand-search"
                type="text"
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder="Filter brands (Samsung, Apple, POCO, iQOO...)"
                className="w-full min-h-[38px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-xs text-white placeholder-[#71717A] outline-none transition-colors"
              />
              <select
                id="device-brand-field"
                value={selectedBrandId}
                onChange={(e) => {
                  setModelQuery('');
                  setModelLimit(24);
                  onSelectBrandId(e.target.value);
                }}
                className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm text-white outline-none transition-colors"
              >
                {filteredBrands.length === 0 ? (
                  <option value={selectedBrandId}>No matching brand</option>
                ) : (
                  filteredBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.deviceCount})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Searchable Model Selector (Newest-First) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="device-model-search"
                  className="text-xs font-medium text-[#A1A1AA]"
                >
                  Smartphone Model ({brandModels.length})
                </label>
                {modelQuery ? (
                  <button
                    type="button"
                    onClick={() => setModelQuery('')}
                    className="text-[11px] text-[#71717A] hover:text-white"
                  >
                    Clear filter
                  </button>
                ) : null}
              </div>
              <input
                id="device-model-search"
                type="text"
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                placeholder="Filter model, chipset, or year (2026, 2025...)"
                className="w-full min-h-[38px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-xs text-white placeholder-[#71717A] outline-none transition-colors"
              />
              {isModelsLoading ? (
                <div className="h-[44px] rounded-lg bg-[#1B1B20] border border-[#29292F] animate-pulse" />
              ) : (
                <select
                  id="device-model-field"
                  value={device.id}
                  onChange={(e) => onSelectModelId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm text-white outline-none transition-colors"
                >
                  {visibleModels.length === 0 ? (
                    <option value="">No models found</option>
                  ) : (
                    visibleModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.model} ({m.releaseYear ?? '—'}) · {m.tier}
                      </option>
                    ))
                  )}
                </select>
              )}
              {filteredModels.length > modelLimit ? (
                <button
                  type="button"
                  onClick={() => setModelLimit((prev) => prev + 24)}
                  className="text-[11px] font-semibold text-[#F0263C] hover:underline"
                >
                  Show more models ({filteredModels.length - modelLimit} more)
                </button>
              ) : null}
            </div>
          </div>

          {/* Variant Selectors: RAM + Storage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                RAM Variant {device.ramType ? `(${device.ramType})` : ''}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ramOptions.map((ram) => {
                  const active = device.ramGb === ram;
                  return (
                    <button
                      key={ram}
                      type="button"
                      onClick={() => onUpdateDeviceField('ramGb', ram)}
                      aria-pressed={active}
                      className={`min-h-[38px] px-3 rounded-lg border font-mono text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#F0263C] border-[#F0263C] text-white'
                          : 'bg-[#111114] border-[#29292F] text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      {ram} GB
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                Storage Variant {device.storageType ? `(${device.storageType})` : ''}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {storageOptions.map((gb) => {
                  const active = device.storageGb === gb;
                  return (
                    <button
                      key={gb}
                      type="button"
                      onClick={() => onUpdateDeviceField('storageGb', gb)}
                      aria-pressed={active}
                      className={`min-h-[38px] px-3 rounded-lg border font-mono text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-white border-white text-black'
                          : 'bg-[#111114] border-[#29292F] text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      {gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Verified Hardware Specification Summary Card */}
          <div className="p-4 rounded-xl bg-[#111114] border border-[#29292F] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#29292F]">
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {formatDeviceFullName(device.brand, device.model)}
                  {device.modelNumber ? (
                    <span className="ml-2 font-mono text-xs font-normal text-[#71717A]">
                      {device.modelNumber}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-[#A1A1AA] mt-0.5">
                  {device.osVersionLaunch || device.os} · {device.tier}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono">
                <ShieldCheck
                  className={`w-3.5 h-3.5 ${
                    compatSummary.isVerified ? 'text-[#F0263C]' : 'text-[#71717A]'
                  }`}
                />
                <span
                  className={
                    compatSummary.isVerified ? 'text-white font-semibold' : 'text-[#A1A1AA]'
                  }
                >
                  {compatSummary.statusLabel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="text-[#71717A] flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Processor &amp; GPU</span>
                </div>
                <div className="text-white font-medium truncate" title={device.chipset}>
                  {device.chipset || '—'}
                </div>
                <div className="text-[#A1A1AA] font-mono text-[11px] truncate">
                  {device.gpuModel || '—'}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[#71717A] flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Display</span>
                </div>
                <div className="text-white font-mono">
                  {device.screenInches.toFixed(2).replace(/\.?0+$/, '')}&quot; ·{' '}
                  {device.refreshHz}Hz
                </div>
                <div className="text-[#A1A1AA] font-mono text-[11px] truncate">
                  {device.resolution} · Touch:{' '}
                  {device.touchSamplingHz ? `${device.touchSamplingHz}Hz` : 'N/A'}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[#71717A] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Launch &amp; Age</span>
                </div>
                <div className="text-white font-mono">
                  {device.releaseDate || '—'}
                </div>
                <div className="text-[#A1A1AA] text-[11px]">
                  {deviceAge || 'Age unavailable'}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[#71717A] flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Sensors &amp; Power</span>
                </div>
                <div className="text-white">
                  Gyro:{' '}
                  {device.gyroscopeSupport === 'hardware'
                    ? 'Hardware'
                    : device.gyroscopeSupport === 'software'
                      ? 'Software'
                      : device.gyroscopeSupport === 'none'
                        ? 'None'
                        : 'Unknown'}
                </div>
                <div className="text-[#A1A1AA] font-mono text-[11px]">
                  {device.batteryMah ? `${device.batteryMah} mAh` : 'Battery N/A'}
                  {device.chargingWatt ? ` · ${device.chargingWatt}W` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Manual Entry Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Group 1: Device Identification */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-[#A1A1AA] tracking-wide">
              Device Identification
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="device-brand-field"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Device Brand
                </label>
                <input
                  id="device-brand-field"
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.deviceBrandMaxLength}
                  value={device.brand}
                  onChange={(e) => onUpdateDeviceField('brand', e.target.value)}
                  placeholder="e.g. Samsung, Apple"
                  className={`w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border text-sm text-white placeholder-[#71717A] outline-none transition-colors ${
                    validationErrors.brand
                      ? 'border-[#F0263C]'
                      : 'border-[#29292F] focus:border-[#F0263C]'
                  }`}
                />
                {validationErrors.brand ? (
                  <p className="text-xs text-[#F0263C] mt-1">
                    {validationErrors.brand}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="device-model-field"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Device Model
                </label>
                <input
                  id="device-model-field"
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.deviceModelMaxLength}
                  value={device.model}
                  onChange={(e) => onUpdateDeviceField('model', e.target.value)}
                  placeholder="e.g. Galaxy S25 Ultra"
                  className={`w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border text-sm text-white placeholder-[#71717A] outline-none transition-colors ${
                    validationErrors.model
                      ? 'border-[#F0263C]'
                      : 'border-[#29292F] focus:border-[#F0263C]'
                  }`}
                />
                {validationErrors.model ? (
                  <p className="text-xs text-[#F0263C] mt-1">
                    {validationErrors.model}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Group 2: Hardware Specifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] tracking-wide">
              <Cpu className="w-3.5 h-3.5 text-[#71717A]" />
              <span>Hardware Specifications</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="device-chipset"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Processor / Chipset
                </label>
                <input
                  id="device-chipset"
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.deviceChipsetMaxLength}
                  value={device.chipset}
                  onChange={(e) => onUpdateDeviceField('chipset', e.target.value)}
                  placeholder="Snapdragon 8 Elite"
                  className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm text-white placeholder-[#71717A] outline-none transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="device-ram"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  RAM
                </label>
                <select
                  id="device-ram"
                  value={device.ramGb}
                  onChange={(e) =>
                    onUpdateDeviceField('ramGb', Number(e.target.value))
                  }
                  className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm font-mono text-white outline-none transition-colors"
                >
                  {RAM_OPTIONS.map((ram) => (
                    <option key={ram} value={ram}>
                      {ram} GB
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="device-storage"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Internal Storage
                </label>
                <select
                  id="device-storage"
                  value={device.storageGb}
                  onChange={(e) =>
                    onUpdateDeviceField('storageGb', Number(e.target.value))
                  }
                  className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm font-mono text-white outline-none transition-colors"
                >
                  {STORAGE_OPTIONS.map((gb) => (
                    <option key={gb} value={gb}>
                      {gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Group 3: Display Specifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] tracking-wide">
              <Monitor className="w-3.5 h-3.5 text-[#71717A]" />
              <span>Display Specifications</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <label
                  htmlFor="device-screen-size"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Screen Size (in)
                </label>
                <input
                  id="device-screen-size"
                  type="number"
                  step="0.1"
                  min={4.5}
                  max={14.0}
                  value={device.screenInches || ''}
                  onChange={(e) =>
                    onUpdateDeviceField('screenInches', Number(e.target.value))
                  }
                  placeholder="6.7"
                  className={`w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border text-sm font-mono text-white placeholder-[#71717A] outline-none transition-colors ${
                    validationErrors.screenInches
                      ? 'border-[#F0263C]'
                      : 'border-[#29292F] focus:border-[#F0263C]'
                  }`}
                />
                {validationErrors.screenInches ? (
                  <p className="text-xs text-[#F0263C] mt-1">
                    {validationErrors.screenInches}
                  </p>
                ) : null}
              </div>

              <div className="sm:col-span-5">
                <label
                  htmlFor="device-resolution"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Screen Resolution
                </label>
                <input
                  id="device-resolution"
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.deviceResolutionMaxLength}
                  value={device.resolution}
                  onChange={(e) =>
                    onUpdateDeviceField('resolution', e.target.value)
                  }
                  placeholder="2400 × 1080"
                  className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm font-mono text-white placeholder-[#71717A] outline-none transition-colors"
                />
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="device-refresh-rate"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Refresh Rate
                </label>
                <select
                  id="device-refresh-rate"
                  value={device.refreshHz}
                  onChange={(e) =>
                    onUpdateDeviceField('refreshHz', Number(e.target.value))
                  }
                  className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm font-mono text-white outline-none transition-colors"
                >
                  {REFRESH_RATES.map((hz) => (
                    <option key={hz} value={hz}>
                      {hz}Hz
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Group 4: Performance Specifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] tracking-wide">
              <HardDrive className="w-3.5 h-3.5 text-[#71717A]" />
              <span>Performance Specifications</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="device-os"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Operating System
                </label>
                <select
                  id="device-os"
                  value={device.os}
                  onChange={(e) =>
                    onUpdateDeviceField('os', e.target.value as DeviceOs)
                  }
                  className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] focus:border-[#F0263C] text-sm text-white outline-none transition-colors"
                >
                  <option value="Android">Android</option>
                  <option value="iOS">iOS</option>
                  <option value="HarmonyOS">HarmonyOS</option>
                </select>
              </div>

              <div>
                <span className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                  Target Game FPS
                </span>
                <div
                  id="device-supported-fps"
                  className="w-full min-h-[44px] px-3 rounded-lg bg-[#111114] border border-[#29292F] flex items-center text-xs font-mono text-white truncate"
                >
                  {compatSummary.options
                    .map((f) => f.replace(/ \(.*\)/, ''))
                    .join(' · ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
