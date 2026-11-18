import { useMemo, useState } from 'react';
import { Search, Smartphone, Sliders, Trash2, X } from 'lucide-react';
import {
  calculateDeviceAge,
  formatDeviceFullName,
  searchDevices,
} from '../engine/devices';
import type { BrandRecord, DeviceOs, DeviceProfile } from '../engine/types';
import { BLUEPRINT_LIMITS } from '../firebase/validation';

interface DevicePickerModalProps {
  isOpen: boolean;
  selectedDevice: DeviceProfile;
  brands: BrandRecord[];
  catalogDevices: DeviceProfile[];
  catalogLoading: boolean;
  customDevices: DeviceProfile[];
  isSignedIn: boolean;
  onSelect: (device: DeviceProfile) => void;
  onSaveCustomDevice: (device: DeviceProfile) => Promise<void>;
  onDeleteCustomDevice: (deviceId: string) => Promise<void>;
  onClose: () => void;
}

export function DevicePickerModal({
  isOpen,
  selectedDevice,
  brands,
  catalogDevices,
  catalogLoading,
  customDevices,
  isSignedIn,
  onSelect,
  onSaveCustomDevice,
  onDeleteCustomDevice,
  onClose,
}: DevicePickerModalProps) {
  const [query, setQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(30);
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog');
  const [saving, setSaving] = useState(false);

  const [customBrand, setCustomBrand] = useState(selectedDevice.brand || '');
  const [customModel, setCustomModel] = useState(selectedDevice.model || '');
  const [customOs, setCustomOs] = useState<DeviceOs>(selectedDevice.os);
  const [customChipset, setCustomChipset] = useState(selectedDevice.chipset || '');
  const [customResolution, setCustomResolution] = useState(
    selectedDevice.resolution || '2400 × 1080'
  );
  const [customInches, setCustomInches] = useState(selectedDevice.screenInches || 6.7);
  const [customHz, setCustomHz] = useState<number>(selectedDevice.refreshHz);
  const [customRam, setCustomRam] = useState(selectedDevice.ramGb);
  const [customStorage, setCustomStorage] = useState(selectedDevice.storageGb);
  const [customTouchHz, setCustomTouchHz] = useState<number>(
    selectedDevice.touchSamplingHz ?? 240
  );
  const [formError, setFormError] = useState<string | null>(null);

  const customDeviceIds = useMemo(
    () => new Set(customDevices.map((d) => d.id)),
    [customDevices]
  );

  const combinedDevices = useMemo(() => {
    const merged = [...customDevices];
    const seen = new Set(customDevices.map((d) => d.id));
    for (const d of catalogDevices) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        merged.push(d);
      }
    }
    return merged;
  }, [customDevices, catalogDevices]);

  const filteredDevices = useMemo(() => {
    const byBrand =
      brandFilter === 'all'
        ? combinedDevices
        : combinedDevices.filter(
            (d) =>
              d.brandId === brandFilter ||
              d.brand.toLowerCase() === brandFilter.toLowerCase()
          );
    return searchDevices(byBrand, query);
  }, [combinedDevices, brandFilter, query]);

  const displayedDevices = filteredDevices.slice(0, visibleCount);

  if (!isOpen) return null;

  const handleApplyCustom = async () => {
    const cleanBrand = customBrand.trim();
    const cleanModel = customModel.trim();
    if (!cleanBrand || !cleanModel) {
      setFormError('Device Brand and Model are required.');
      return;
    }
    setFormError(null);

    const newDevice: DeviceProfile = {
      id: 'custom-device',
      brand: cleanBrand,
      model: cleanModel,
      os: customOs,
      chipset: customChipset.trim() || 'Mobile SoC',
      ramGb: Number(customRam),
      storageGb: Number(customStorage),
      screenInches: Number(customInches),
      resolution: customResolution.trim() || '2400 × 1080',
      refreshHz: customHz,
      touchSamplingHz: Number(customTouchHz),
      supportedFpsByGame: {
        'free-fire': customHz >= 90 ? ['30 FPS', '60 FPS', '90 FPS'] : ['30 FPS', '60 FPS'],
        'pubg-bgmi':
          customHz >= 90
            ? ['40 FPS (Ultra)', '60 FPS (Extreme)', '90 FPS']
            : ['30 FPS (High)', '40 FPS (Ultra)', '60 FPS (Extreme)'],
      },
      tier: customInches >= 9.0 ? 'Tablet' : customHz >= 120 ? 'Esports' : 'Mid-Range',
    };

    if (isSignedIn) {
      setSaving(true);
      try {
        await onSaveCustomDevice(newDevice);
      } finally {
        setSaving(false);
      }
    }
    onSelect(newDevice);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-modal-title"
    >
      <div className="w-full md:max-w-2xl bg-[#141417] border-t md:border border-[#29292F] rounded-t-3xl md:rounded-2xl max-h-[86vh] flex flex-col overflow-hidden">
        <div className="md:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-[#3F3F46]" />
        </div>

        <div className="px-5 py-4 border-b border-[#29292F] flex items-center justify-between gap-4">
          <div>
            <h2
              id="device-modal-title"
              className="font-display text-2xl font-bold tracking-tight text-white"
            >
              Cloud Smartphone Database
            </h2>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Search verified smartphones in Firestore or save custom hardware specs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close device picker"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#1B1B20] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-2">
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#111114] border border-[#29292F] rounded-xl">
            <button
              type="button"
              onClick={() => setMode('catalog')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                mode === 'catalog'
                  ? 'bg-white text-black'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Firestore Catalog ({combinedDevices.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                mode === 'custom'
                  ? 'bg-white text-black'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Add Custom Device</span>
            </button>
          </div>
        </div>

        {mode === 'catalog' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-2 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <label htmlFor="device-search-input" className="sr-only">
                  Search saved cloud devices
                </label>
                <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="device-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setVisibleCount(30);
                  }}
                  placeholder="Search brand, model, chipset, GPU, or year..."
                  className="w-full min-h-[44px] pl-10 pr-4 bg-[#111114] border border-[#29292F] focus:border-[#F0263C] rounded-xl text-sm text-white placeholder-[#71717A] outline-none transition-colors"
                />
              </div>

              <select
                aria-label="Filter by smartphone brand"
                value={brandFilter}
                onChange={(e) => {
                  setBrandFilter(e.target.value);
                  setVisibleCount(30);
                }}
                className="min-h-[44px] px-3 bg-[#111114] border border-[#29292F] focus:border-[#F0263C] rounded-xl text-xs font-semibold text-white outline-none"
              >
                <option value="all">All Brands ({brands.length})</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.deviceCount})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 divide-y divide-[#29292F]">
              {catalogLoading && combinedDevices.length === 0 ? (
                <div className="py-6 space-y-2.5">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-14 rounded-xl bg-[#1B1B20] border border-[#29292F] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-[#A1A1AA]">
                    {combinedDevices.length === 0
                      ? 'No smartphones synced in Firestore yet. Add custom device specs to get started.'
                      : 'No matching smartphone found in Firestore.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode('custom')}
                    className="min-h-[44px] px-4 py-2 rounded-lg bg-[#F0263C] hover:bg-[#B8172A] text-white text-xs font-semibold transition-colors"
                  >
                    Add Custom Device
                  </button>
                </div>
              ) : (
                <>
                  {displayedDevices.map((dev) => {
                    const isSelected = selectedDevice.id === dev.id;
                    const canDelete = customDeviceIds.has(dev.id);
                    const age = calculateDeviceAge(dev.releaseDate);
                    return (
                      <div
                        key={dev.id}
                        className={`py-2.5 flex items-center justify-between gap-2 ${
                          isSelected ? 'bg-[#1B1B20] -mx-3 px-3 rounded-xl' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(dev);
                            onClose();
                          }}
                          className="flex-1 min-w-0 min-h-[48px] text-left flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {formatDeviceFullName(dev.brand, dev.model)}
                              {dev.releaseYear ? (
                                <span className="ml-2 font-mono text-[11px] font-normal text-[#71717A]">
                                  {dev.releaseYear}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-[#A1A1AA] mt-0.5 font-mono tabular-nums truncate">
                              {dev.chipset} · {dev.screenInches.toFixed(1)}&quot; ·{' '}
                              {dev.refreshHz}Hz · {dev.ramGb}GB
                              {age ? ` · ${age}` : ''}
                            </div>
                          </div>
                          <span
                            className={`text-xs font-semibold shrink-0 whitespace-nowrap ${
                              isSelected ? 'text-[#F0263C]' : 'text-[#A1A1AA]'
                            }`}
                          >
                            {isSelected ? 'Active' : 'Select'}
                          </span>
                        </button>

                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => void onDeleteCustomDevice(dev.id)}
                            aria-label={`Delete ${dev.brand} ${dev.model}`}
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#71717A] hover:text-[#F0263C] hover:bg-[#111114] transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                  {filteredDevices.length > visibleCount ? (
                    <div className="pt-3 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((c) => c + 30)}
                        className="min-h-[40px] px-4 rounded-lg bg-[#1B1B20] border border-[#29292F] text-xs font-semibold text-white hover:border-[#F0263C]"
                      >
                        Load more ({filteredDevices.length - visibleCount} remaining)
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {formError ? (
              <div className="p-3 rounded-lg bg-[#F0263C]/10 border border-[#F0263C] text-xs text-[#F0263C]">
                {formError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="custom-brand-name"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Device Brand
                </label>
                <input
                  id="custom-brand-name"
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.deviceBrandMaxLength}
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="e.g. Samsung"
                  className="w-full min-h-[44px] px-3.5 bg-[#111114] border border-[#29292F] focus:border-[#F0263C] rounded-xl text-sm text-white placeholder-[#71717A] outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="custom-model-name"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Device Model
                </label>
                <input
                  id="custom-model-name"
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.deviceModelMaxLength}
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="e.g. Galaxy S25 Ultra"
                  className="w-full min-h-[44px] px-3.5 bg-[#111114] border border-[#29292F] focus:border-[#F0263C] rounded-xl text-sm text-white placeholder-[#71717A] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="custom-chipset-name"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Chipset
                </label>
                <input
                  id="custom-chipset-name"
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.deviceChipsetMaxLength}
                  value={customChipset}
                  onChange={(e) => setCustomChipset(e.target.value)}
                  placeholder="e.g. Snapdragon 8 Elite"
                  className="w-full min-h-[44px] px-3.5 bg-[#111114] border border-[#29292F] focus:border-[#F0263C] rounded-xl text-sm text-white placeholder-[#71717A] outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="custom-resolution-name"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Resolution
                </label>
                <input
                  id="custom-resolution-name"
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.deviceResolutionMaxLength}
                  value={customResolution}
                  onChange={(e) => setCustomResolution(e.target.value)}
                  placeholder="e.g. 2400 × 1080"
                  className="w-full min-h-[44px] px-3.5 bg-[#111114] border border-[#29292F] focus:border-[#F0263C] rounded-xl text-sm font-mono text-white placeholder-[#71717A] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                  Operating System
                </span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-[#111114] border border-[#29292F] rounded-xl">
                  {(['Android', 'iOS'] as const).map((os) => (
                    <button
                      key={os}
                      type="button"
                      onClick={() => setCustomOs(os)}
                      className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                        customOs === os
                          ? 'bg-white text-black'
                          : 'text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      {os}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                  Refresh Rate
                </span>
                <div className="grid grid-cols-4 gap-1 p-1 bg-[#111114] border border-[#29292F] rounded-xl">
                  {([60, 90, 120, 144] as const).map((hz) => (
                    <button
                      key={hz}
                      type="button"
                      onClick={() => setCustomHz(hz)}
                      className={`min-h-[38px] rounded-lg text-xs font-mono font-semibold transition-colors ${
                        customHz === hz
                          ? 'bg-[#F0263C] text-white'
                          : 'text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      {hz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="custom-screen-inches" className="font-medium text-[#A1A1AA]">
                  Display Size
                </label>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {customInches.toFixed(1)} in
                </span>
              </div>
              <input
                id="custom-screen-inches"
                type="range"
                min={5.4}
                max={12.9}
                step={0.1}
                value={customInches}
                onChange={(e) => setCustomInches(Number(e.target.value))}
                className="giq-slider bg-[#29292F]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="custom-ram-select"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  RAM
                </label>
                <select
                  id="custom-ram-select"
                  value={customRam}
                  onChange={(e) => setCustomRam(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 bg-[#111114] border border-[#29292F] rounded-xl text-sm text-white font-mono outline-none"
                >
                  {[4, 6, 8, 12, 16, 24].map((r) => (
                    <option key={r} value={r}>
                      {r} GB
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="custom-storage-select"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Storage
                </label>
                <select
                  id="custom-storage-select"
                  value={customStorage}
                  onChange={(e) => setCustomStorage(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 bg-[#111114] border border-[#29292F] rounded-xl text-sm text-white font-mono outline-none"
                >
                  {[64, 128, 256, 512, 1024].map((s) => (
                    <option key={s} value={s}>
                      {s === 1024 ? '1 TB' : `${s} GB`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="custom-touch-select"
                  className="block text-xs font-medium text-[#A1A1AA] mb-1.5"
                >
                  Touch Hz
                </label>
                <select
                  id="custom-touch-select"
                  value={customTouchHz}
                  onChange={(e) => setCustomTouchHz(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 bg-[#111114] border border-[#29292F] rounded-xl text-sm text-white font-mono outline-none"
                >
                  {[120, 180, 240, 360, 480, 720, 960].map((t) => (
                    <option key={t} value={t}>
                      {t} Hz
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 pb-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleApplyCustom()}
                className="w-full min-h-[48px] rounded-xl bg-[#F0263C] hover:bg-[#B8172A] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {saving
                  ? 'Saving to Firestore...'
                  : isSignedIn
                    ? 'Save to Cloud & Apply Device'
                    : 'Apply Device Specs'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
