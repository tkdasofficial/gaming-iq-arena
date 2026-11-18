import { CircleCheck, CircleDashed } from 'lucide-react';
import type { VerifiedDevice } from '../engine/recommend';
import { cn } from '@/lib/utils';

interface SpecRow {
  label: string;
  value: string | null;
}

export function deviceSpecRows(d: VerifiedDevice, full = false): SpecRow[] {
  const ram = d.ramGb.length ? `${d.ramGb.join(' / ')} GB${d.ramType ? ` ${d.ramType}` : ''}` : null;
  const gyro =
    d.gyroscope === 'hardware' ? 'Hardware' : d.gyroscope === 'software' ? 'Software only' : d.gyroscope === 'none' ? 'Not available' : null;
  const rows: SpecRow[] = [
    { label: 'Chipset', value: d.chipset },
    { label: 'Display', value: d.display.sizeInches ? `${d.display.sizeInches}"${d.display.panelType ? ` ${d.display.panelType}` : ''}` : null },
    { label: 'Refresh rate', value: d.display.refreshHz ? `${d.display.refreshHz} Hz` : null },
    { label: 'Touch sampling', value: d.display.touchSamplingHz ? `${d.display.touchSamplingHz} Hz` : null },
    { label: 'Resolution', value: d.display.resolution },
    { label: 'Gyroscope', value: gyro },
  ];
  if (full) {
    rows.push(
      { label: 'GPU', value: d.gpu },
      { label: 'RAM', value: ram },
      { label: 'OS at launch', value: d.osVersion ?? d.os },
      { label: 'Battery', value: d.batteryMah ? `${d.batteryMah} mAh` : null }
    );
  }
  return rows;
}

/** Hardware facts from the catalog. Unknown values are labelled, never filled in. */
export function DeviceSpecs({ device, full = false, className }: { device: VerifiedDevice; full?: boolean; className?: string }) {
  const rows = deviceSpecRows(device, full);
  return (
    <dl className={cn('grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3', className)}>
      {rows.map((r) => (
        <div key={r.label} className="min-w-0">
          <dt className="text-[11px] text-muted-foreground">{r.label}</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium">
            {r.value ? (
              <>
                <CircleCheck className="size-3.5 shrink-0 text-foreground/70" aria-hidden="true" />
                <span className="truncate" title={r.value}>{r.value}</span>
              </>
            ) : (
              <>
                <CircleDashed className="size-3.5 shrink-0 text-subtle" aria-hidden="true" />
                <span className="text-muted-foreground">Not verified</span>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
