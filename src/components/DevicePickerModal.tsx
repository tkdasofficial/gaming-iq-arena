import { useMemo, useState } from 'react';
import { Check, Search, Smartphone, Sliders, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet } from './giq/Sheet';
import { Chip, FieldLabel, RangeSlider, Segmented, SelectField, TextField } from './giq/primitives';
import {
  calculateDeviceAge,
  formatDeviceFullName,
  searchDevices,
} from '../engine/devices';
import type { BrandRecord, DeviceOs, DeviceProfile } from '../engine/types';
import { FIELD_LIMITS } from '../backend/validation';

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
    <Sheet
      open={isOpen}
      onClose={onClose}
      labelId="device-modal-title"
      title="Find your phone"
      subtitle="Search the catalog or add your own specs."
      footer={
        mode === 'custom' ? (
          <Button variant="glow" size="xl" className="w-full" disabled={saving} onClick={() => void handleApplyCustom()}>
            {saving ? 'Saving…' : isSignedIn ? 'Save & use this phone' : 'Use this phone'}
          </Button>
        ) : undefined
      }
    >
      <div className="px-5 pb-3">
        <Segmented
          layoutId="picker-mode"
          ariaLabel="Picker mode"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { id: 'catalog', label: `Catalog (${combinedDevices.length})`, icon: Smartphone },
            { id: 'custom', label: 'Custom', icon: Sliders },
          ]}
        />
      </div>

      {mode === 'catalog' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-5 pb-3">
            <div className="relative">
              <label htmlFor="device-search-input" className="sr-only">
                Search phones
              </label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <TextField
                id="device-search-input"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisibleCount(30);
                }}
                placeholder="Model, chipset, year…"
                className="pl-10"
              />
            </div>
            <SelectField
              aria-label="Filter by brand"
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value);
                setVisibleCount(30);
              }}
              className="w-32 text-xs font-semibold sm:w-40"
            >
              <option value="all">All brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.deviceCount})
                </option>
              ))}
            </SelectField>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pb-safe">
            {catalogLoading && combinedDevices.length === 0 ? (
              <div className="space-y-2 px-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="skeleton h-16 rounded-2xl" />
                ))}
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="space-y-4 px-2 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {combinedDevices.length === 0
                    ? 'No phones in the catalog yet. Add your own specs instead.'
                    : 'No matching phone found.'}
                </p>
                <Button variant="glow" size="md" onClick={() => setMode('custom')}>
                  Add custom phone
                </Button>
              </div>
            ) : (
              <ul className="space-y-1">
                {displayedDevices.map((dev) => {
                  const isSelected = selectedDevice.id === dev.id;
                  const canDelete = customDeviceIds.has(dev.id);
                  const age = calculateDeviceAge(dev.releaseDate);
                  return (
                    <li
                      key={dev.id}
                      className={cn(
                        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-2xl border transition-colors',
                        isSelected ? 'border-primary/50 bg-primary/10' : 'border-transparent hover:bg-secondary'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(dev);
                          onClose();
                        }}
                        className="grid min-h-16 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-2.5 py-2 text-left"
                      >
                        <span
                          className={cn(
                            'grid size-10 place-items-center rounded-xl border',
                            isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary text-muted-foreground'
                          )}
                        >
                          {isSelected ? <Check className="size-4" strokeWidth={3} /> : <Smartphone className="size-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {formatDeviceFullName(dev.brand, dev.model)}
                          </span>
                          <span className="block truncate font-mono text-[11px] text-muted-foreground tabular-nums">
                            {dev.chipset} · {dev.refreshHz}Hz · {dev.ramGb}GB{age ? ` · ${age}` : ''}
                          </span>
                        </span>
                        {dev.releaseYear ? (
                          <span className="font-mono text-[11px] font-semibold text-subtle">{dev.releaseYear}</span>
                        ) : null}
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => void onDeleteCustomDevice(dev.id)}
                          aria-label={`Delete ${dev.brand} ${dev.model}`}
                          className="mr-1.5 grid size-9 place-items-center rounded-xl text-subtle transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
                {filteredDevices.length > visibleCount ? (
                  <li className="pt-3 text-center">
                    <Button variant="surface" size="md" onClick={() => setVisibleCount((c) => c + 30)}>
                      Show more ({filteredDevices.length - visibleCount})
                    </Button>
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
          {formError ? (
            <div className="rounded-xl border border-primary/50 bg-primary/10 p-3 text-xs font-medium text-primary">{formError}</div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <FieldLabel htmlFor="custom-brand-name">Brand</FieldLabel>
              <TextField
                id="custom-brand-name"
                maxLength={FIELD_LIMITS.deviceBrandMaxLength}
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                placeholder="Samsung"
              />
            </div>
            <div className="min-w-0">
              <FieldLabel htmlFor="custom-model-name">Model</FieldLabel>
              <TextField
                id="custom-model-name"
                maxLength={FIELD_LIMITS.deviceModelMaxLength}
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Galaxy S25 Ultra"
              />
            </div>
            <div className="min-w-0">
              <FieldLabel htmlFor="custom-chipset-name">Chipset</FieldLabel>
              <TextField
                id="custom-chipset-name"
                maxLength={FIELD_LIMITS.deviceChipsetMaxLength}
                value={customChipset}
                onChange={(e) => setCustomChipset(e.target.value)}
                placeholder="Snapdragon 8 Elite"
              />
            </div>
            <div className="min-w-0">
              <FieldLabel htmlFor="custom-resolution-name">Resolution</FieldLabel>
              <TextField
                id="custom-resolution-name"
                maxLength={FIELD_LIMITS.deviceResolutionMaxLength}
                value={customResolution}
                onChange={(e) => setCustomResolution(e.target.value)}
                placeholder="2400 × 1080"
                className="font-mono"
              />
            </div>
          </div>

          <div>
            <FieldLabel>System</FieldLabel>
            <Segmented
              layoutId="custom-os"
              size="sm"
              value={customOs}
              onChange={setCustomOs}
              options={[
                { id: 'Android' as DeviceOs, label: 'Android' },
                { id: 'iOS' as DeviceOs, label: 'iOS' },
              ]}
            />
          </div>

          <div>
            <FieldLabel>Refresh rate</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {([60, 90, 120, 144] as const).map((hz) => (
                <Chip key={hz} active={customHz === hz} onClick={() => setCustomHz(hz)}>
                  {hz}Hz
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="custom-screen-inches" hint={`${customInches.toFixed(1)} in`}>
              Screen size
            </FieldLabel>
            <div className="flex h-12 items-center rounded-xl border border-border bg-secondary px-4">
              <RangeSlider id="custom-screen-inches" min={5.4} max={12.9} step={0.1} value={customInches} onChange={setCustomInches} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="min-w-0">
              <FieldLabel htmlFor="custom-ram-select">RAM</FieldLabel>
              <SelectField id="custom-ram-select" value={customRam} onChange={(e) => setCustomRam(Number(e.target.value))} className="pl-3 pr-8 font-mono">
                {[4, 6, 8, 12, 16, 24].map((r) => (
                  <option key={r} value={r}>
                    {r} GB
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="min-w-0">
              <FieldLabel htmlFor="custom-storage-select">Storage</FieldLabel>
              <SelectField
                id="custom-storage-select"
                value={customStorage}
                onChange={(e) => setCustomStorage(Number(e.target.value))}
                className="pl-3 pr-8 font-mono"
              >
                {[64, 128, 256, 512, 1024].map((st) => (
                  <option key={st} value={st}>
                    {st === 1024 ? '1 TB' : `${st} GB`}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="min-w-0">
              <FieldLabel htmlFor="custom-touch-select">Touch</FieldLabel>
              <SelectField
                id="custom-touch-select"
                value={customTouchHz}
                onChange={(e) => setCustomTouchHz(Number(e.target.value))}
                className="pl-3 pr-8 font-mono"
              >
                {[120, 180, 240, 360, 480, 720, 960].map((t) => (
                  <option key={t} value={t}>
                    {t}Hz
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
