import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  BookmarkCheck,
  BookmarkPlus,
  Calendar,
  Cpu,
  Database,
  HardDrive,
  Keyboard,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { calculateDeviceAge, formatDeviceFullName, getGameCompatibilitySummary } from '../engine/devices';
import type { BrandRecord, DeviceOs, DeviceProfile, GameId } from '../engine/types';
import { FIELD_LIMITS } from '../backend/validation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Chip,
  Disclosure,
  FieldError,
  FieldLabel,
  IconAction,
  Notice,
  Panel,
  Segmented,
  SelectField,
  SpecTile,
  TextField,
} from './giq/primitives';

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
  onUpdateDeviceField: <K extends keyof DeviceProfile>(key: K, value: DeviceProfile[K]) => void;
  onOpenCatalogModal: () => void;
  onSaveDeviceToCloud: () => void;
  onRetryDatabase: () => void;
  onOpenAdminSync: () => void;
}

const RAM_OPTIONS = [4, 6, 8, 12, 16, 24];
const STORAGE_OPTIONS = [64, 128, 256, 512, 1024, 2048];
const REFRESH_RATES = [60, 90, 120, 144, 165, 185, 240];

const formatStorage = (gb: number) => (gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`);

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
  const compatSummary = getGameCompatibilitySummary(device, game);
  const deviceAge = calculateDeviceAge(device.releaseDate);
  const isDatabaseMode = !isManualMode && brands.length > 0;
  const isModelsLoading = Boolean(selectedBrandId) && devicesLoadingBrand === selectedBrandId;

  const ramOptions =
    isDatabaseMode && device.ramVariantsGb && device.ramVariantsGb.length > 0 ? device.ramVariantsGb : RAM_OPTIONS;
  const storageOptions =
    isDatabaseMode && device.storageVariantsGb && device.storageVariantsGb.length > 0
      ? device.storageVariantsGb
      : STORAGE_OPTIONS;

  const gyroLabel =
    device.gyroscopeSupport === 'hardware'
      ? 'Hardware'
      : device.gyroscopeSupport === 'software'
        ? 'Software'
        : device.gyroscopeSupport === 'none'
          ? 'None'
          : 'Unknown';

  return (
    <Panel
      step="02"
      title="Your phone"
      meta={device.model ? formatDeviceFullName(device.brand, device.model) : 'Pick your device'}
      action={
        <>
          <IconAction icon={Search} label="Search all phones" onClick={onOpenCatalogModal} />
          {isAdmin ? <IconAction icon={Database} label="Sync phone catalog" onClick={onOpenAdminSync} /> : null}
          <IconAction
            icon={deviceSavedToast ? BookmarkCheck : BookmarkPlus}
            label={deviceSavedToast ? 'Saved' : isSignedIn ? 'Save device' : 'Sign in to save'}
            onClick={onSaveDeviceToCloud}
            active={deviceSavedToast}
          />
        </>
      }
    >
      <div className="space-y-4">
        {brands.length > 0 ? (
          <Segmented
            layoutId="device-mode"
            ariaLabel="Device entry mode"
            size="sm"
            value={isManualMode ? 'manual' : 'catalog'}
            onChange={(v) => onToggleManualMode(v === 'manual')}
            options={[
              { id: 'catalog', label: 'From catalog', icon: Smartphone },
              { id: 'manual', label: 'Enter manually', icon: Keyboard },
            ]}
          />
        ) : null}

        {brandsLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-live="polite">
            <div className="skeleton h-12 rounded-xl" />
            <div className="skeleton h-12 rounded-xl" />
          </div>
        ) : brandsError || devicesError ? (
          <Notice
            tone="danger"
            icon={AlertTriangle}
            action={
              <>
                <Button variant="surface" size="sm" onClick={onRetryDatabase} className="h-9 rounded-lg">
                  <RefreshCw /> Retry
                </Button>
              </>
            }
          >
            Couldn't load the phone catalog. Retry or enter your specs manually.
          </Notice>
        ) : brands.length === 0 ? (
          <Notice
            icon={Database}
            action={
              isAdmin ? (
                <Button variant="glow" size="sm" onClick={onOpenAdminSync} className="h-9 rounded-lg">
                  Sync catalog
                </Button>
              ) : null
            }
          >
            The phone catalog is empty for now — enter your specs below.
          </Notice>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          {isDatabaseMode ? (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <FieldLabel htmlFor="device-brand-field" hint={brands.length}>
                    Brand
                  </FieldLabel>
                  <SelectField
                    id="device-brand-field"
                    value={selectedBrandId}
                    onChange={(e) => onSelectBrandId(e.target.value)}
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.deviceCount})
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="min-w-0">
                  <FieldLabel htmlFor="device-model-field" hint={brandModels.length}>
                    Model
                  </FieldLabel>
                  {isModelsLoading ? (
                    <div className="skeleton h-12 rounded-xl" />
                  ) : (
                    <SelectField
                      id="device-model-field"
                      value={device.id}
                      onChange={(e) => onSelectModelId(e.target.value)}
                    >
                      {brandModels.length === 0 ? (
                        <option value="">No models found</option>
                      ) : (
                        brandModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.model} · {m.releaseYear ?? '—'}
                          </option>
                        ))
                      )}
                    </SelectField>
                  )}
                </div>
              </div>

              {/* Device hero card */}
              <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/60 p-4">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-60" />
                <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5">
                  <div className="grid h-14 w-10 place-items-center rounded-xl border-2 border-border-strong bg-background">
                    <span className="h-1 w-3 rounded-full bg-surface-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold">{formatDeviceFullName(device.brand, device.model)}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {device.osVersionLaunch || device.os} · {device.tier}
                    </div>
                    <div
                      className={cn(
                        'mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        compatSummary.isVerified ? 'bg-success/12 text-success' : 'bg-surface-3 text-muted-foreground'
                      )}
                    >
                      <ShieldCheck className="size-3" />
                      {compatSummary.statusLabel}
                    </div>
                  </div>
                </div>
                <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { k: 'Refresh', v: `${device.refreshHz}Hz` },
                    { k: 'Screen', v: `${device.screenInches.toFixed(1)}"` },
                    { k: 'Touch', v: device.touchSamplingHz ? `${device.touchSamplingHz}Hz` : '—' },
                  ].map((s) => (
                    <div key={s.k} className="rounded-xl border border-border bg-background/50 px-2 py-2">
                      <div className="font-mono text-sm font-bold tabular-nums">{s.v}</div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-subtle">{s.k}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <FieldLabel hint={device.ramType || undefined}>RAM</FieldLabel>
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {ramOptions.map((ram) => (
                      <Chip key={ram} active={device.ramGb === ram} onClick={() => onUpdateDeviceField('ramGb', ram)}>
                        {ram} GB
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel hint={device.storageType || undefined}>Storage</FieldLabel>
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {storageOptions.map((gb) => (
                      <Chip key={gb} active={device.storageGb === gb} onClick={() => onUpdateDeviceField('storageGb', gb)}>
                        {formatStorage(gb)}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

              <Disclosure title="Full specifications" icon={Cpu}>
                <div className="grid grid-cols-2 gap-2">
                  <SpecTile icon={Cpu} label="Chipset" value={device.chipset || '—'} sub={device.gpuModel || '—'} />
                  <SpecTile
                    icon={Monitor}
                    label="Display"
                    value={`${device.screenInches.toFixed(2).replace(/\.?0+$/, '')}" · ${device.refreshHz}Hz`}
                    sub={device.resolution}
                  />
                  <SpecTile
                    icon={Calendar}
                    label="Launch"
                    value={device.releaseDate || '—'}
                    sub={deviceAge || 'Age unavailable'}
                  />
                  <SpecTile
                    icon={HardDrive}
                    label="Sensors"
                    value={`Gyro · ${gyroLabel}`}
                    sub={`${device.batteryMah ? `${device.batteryMah} mAh` : 'Battery N/A'}${device.chargingWatt ? ` · ${device.chargingWatt}W` : ''}`}
                  />
                </div>
              </Disclosure>
            </motion.div>
          ) : (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <FieldLabel htmlFor="device-brand-field">Brand</FieldLabel>
                  <TextField
                    id="device-brand-field"
                    maxLength={FIELD_LIMITS.deviceBrandMaxLength}
                    value={device.brand}
                    onChange={(e) => onUpdateDeviceField('brand', e.target.value)}
                    placeholder="Samsung"
                    invalid={Boolean(validationErrors.brand)}
                  />
                  <FieldError>{validationErrors.brand}</FieldError>
                </div>
                <div className="min-w-0">
                  <FieldLabel htmlFor="device-model-field">Model</FieldLabel>
                  <TextField
                    id="device-model-field"
                    maxLength={FIELD_LIMITS.deviceModelMaxLength}
                    value={device.model}
                    onChange={(e) => onUpdateDeviceField('model', e.target.value)}
                    placeholder="Galaxy S25 Ultra"
                    invalid={Boolean(validationErrors.model)}
                  />
                  <FieldError>{validationErrors.model}</FieldError>
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="device-chipset">Chipset</FieldLabel>
                <TextField
                  id="device-chipset"
                  maxLength={FIELD_LIMITS.deviceChipsetMaxLength}
                  value={device.chipset}
                  onChange={(e) => onUpdateDeviceField('chipset', e.target.value)}
                  placeholder="Snapdragon 8 Elite"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <FieldLabel htmlFor="device-screen-size">Screen (in)</FieldLabel>
                  <TextField
                    id="device-screen-size"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={4.5}
                    max={14.0}
                    value={device.screenInches || ''}
                    onChange={(e) => onUpdateDeviceField('screenInches', Number(e.target.value))}
                    placeholder="6.7"
                    invalid={Boolean(validationErrors.screenInches)}
                    className="font-mono"
                  />
                  <FieldError>{validationErrors.screenInches}</FieldError>
                </div>
                <div className="min-w-0">
                  <FieldLabel htmlFor="device-resolution">Resolution</FieldLabel>
                  <TextField
                    id="device-resolution"
                    maxLength={FIELD_LIMITS.deviceResolutionMaxLength}
                    value={device.resolution}
                    onChange={(e) => onUpdateDeviceField('resolution', e.target.value)}
                    placeholder="2400 × 1080"
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Refresh rate</FieldLabel>
                <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {REFRESH_RATES.map((hz) => (
                    <Chip key={hz} active={device.refreshHz === hz} onClick={() => onUpdateDeviceField('refreshHz', hz)}>
                      {hz}Hz
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <FieldLabel htmlFor="device-ram">RAM</FieldLabel>
                  <SelectField
                    id="device-ram"
                    value={device.ramGb}
                    onChange={(e) => onUpdateDeviceField('ramGb', Number(e.target.value))}
                    className="px-3 font-mono"
                  >
                    {RAM_OPTIONS.map((ram) => (
                      <option key={ram} value={ram}>
                        {ram} GB
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="min-w-0">
                  <FieldLabel htmlFor="device-storage">Storage</FieldLabel>
                  <SelectField
                    id="device-storage"
                    value={device.storageGb}
                    onChange={(e) => onUpdateDeviceField('storageGb', Number(e.target.value))}
                    className="px-3 font-mono"
                  >
                    {STORAGE_OPTIONS.map((gb) => (
                      <option key={gb} value={gb}>
                        {formatStorage(gb)}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="min-w-0">
                  <FieldLabel htmlFor="device-os">System</FieldLabel>
                  <SelectField
                    id="device-os"
                    value={device.os}
                    onChange={(e) => onUpdateDeviceField('os', e.target.value as DeviceOs)}
                    className="px-3"
                  >
                    <option value="Android">Android</option>
                    <option value="iOS">iOS</option>
                    <option value="HarmonyOS">HarmonyOS</option>
                  </SelectField>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-3.5 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Supported FPS
                </span>
                <span id="device-supported-fps" className="truncate font-mono text-xs font-semibold">
                  {compatSummary.options.map((f) => f.replace(/ \(.*\)/, '')).join(' · ')}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  );
}
