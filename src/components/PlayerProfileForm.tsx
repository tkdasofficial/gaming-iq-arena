import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Check, ChevronDown } from 'lucide-react';
import { getPlayerProfile, savePlayerProfile } from '../backend/player.functions';
import { EMPTY_PLAYER, type PlayerProfile } from '../engine/freefire/player';
import { PLAYER_KEYS } from '../engine/freefire/config';
import { Button } from '@/components/ui/button';
import { Spinner } from './giq/primitives';

type Opt = { value: string; label: string };
const FIELDS: { key: keyof PlayerProfile; label: string; options: Opt[] }[] = [
  { key: 'fingerCount', label: 'Fingers you play with', options: [{ value: '2', label: '2 (thumbs)' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5 or more' }] },
  { key: 'swipeLength', label: 'Swipe length', options: [{ value: 'short', label: 'Short' }, { value: 'medium', label: 'Medium' }, { value: 'long', label: 'Long' }] },
  { key: 'swipeSpeed', label: 'Swipe speed', options: [{ value: 'slow', label: 'Slow' }, { value: 'medium', label: 'Medium' }, { value: 'fast', label: 'Fast' }] },
  { key: 'playStyle', label: 'Play style', options: [{ value: 'close-range-aggressive', label: 'Close-range, aggressive' }, { value: 'balanced', label: 'Balanced' }, { value: 'long-range', label: 'Long-range' }, { value: 'precision', label: 'Precision' }] },
  { key: 'weaponPreference', label: 'Main weapons', options: [{ value: 'smg-shotgun', label: 'SMG / shotgun' }, { value: 'assault-rifle', label: 'Assault rifle' }, { value: 'sniper', label: 'Sniper' }, { value: 'mixed', label: 'A mix' }] },
  { key: 'dragTechnique', label: 'Shooting style', options: [{ value: 'drag-shot', label: 'Drag shot' }, { value: 'tap-fire', label: 'Tap fire' }, { value: 'mixed', label: 'Both' }] },
  { key: 'comfortPreference', label: 'Aim should feel', options: [{ value: 'fast', label: 'Fast' }, { value: 'balanced', label: 'Balanced' }, { value: 'controlled', label: 'Controlled' }] },
  { key: 'hudLayout', label: 'Button layout', options: [{ value: 'default', label: 'Default' }, { value: 'custom', label: 'Custom' }] },
  { key: 'fireButtonPosition', label: 'Fire button side', options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }, { value: 'both', label: 'Both' }] },
  { key: 'usesFreeLook', label: 'Use Free Look?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
];

const selectCls = 'h-10 w-full rounded-lg border border-input bg-card px-2.5 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const toStr = (p: PlayerProfile, k: keyof PlayerProfile) => {
  const v = p[k];
  if (v === null) return '';
  if (k === 'usesFreeLook') return v ? 'yes' : 'no';
  if (k === 'fingerCount') return String(Math.min(5, v as number));
  return String(v);
};

/** Optional answers about how a signed-in player plays. Every field can stay "Not sure". */
export function PlayerProfileForm({ gameId, onSaved }: { gameId: string; onSaved: () => void }) {
  const qc = useQueryClient();
  const load = useServerFn(getPlayerProfile);
  const save = useServerFn(savePlayerProfile);
  const key = ['player-profile', gameId];
  const profile = useQuery({ queryKey: key, queryFn: () => load({ data: { gameId } }), staleTime: 60_000 });
  const [draft, setDraft] = useState<PlayerProfile>(EMPTY_PLAYER);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (profile.data !== undefined) setDraft(profile.data ?? EMPTY_PLAYER);
  }, [profile.data]);

  const answered = PLAYER_KEYS.filter((k) => draft[k] !== null).length;

  const set = (k: keyof PlayerProfile, raw: string) => {
    setStatus('idle');
    let v: unknown = raw === '' ? null : raw;
    if (raw !== '' && k === 'fingerCount') v = Number(raw);
    if (raw !== '' && k === 'usesFreeLook') v = raw === 'yes';
    if (k === 'fireButtonSize') v = raw === '' ? null : Number(raw);
    setDraft((d) => ({ ...d, [k]: v }) as PlayerProfile);
  };

  const onSave = async () => {
    const size = draft.fireButtonSize;
    if (size !== null && (!Number.isInteger(size) || size < 10 || size > 200)) {
      setStatus('error');
      return;
    }
    setStatus('saving');
    try {
      const saved = await save({ data: { gameId, profile: draft } });
      qc.setQueryData(key, saved);
      setStatus('saved');
      onSaved();
    } catch {
      setStatus('error');
    }
  };

  return (
    <details className="group rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-[13px] font-medium">How you play <span className="font-normal text-muted-foreground">(optional)</span></span>
          <span className="block text-[11px] text-muted-foreground">
            {profile.isLoading ? 'Loading…' : answered ? `${answered} answered · makes values more personal` : 'A few quick answers make values more personal'}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-3 px-3 pb-3">
        <div className="grid grid-cols-2 gap-2.5">
          {FIELDS.map((f) => (
            <label key={f.key} className="min-w-0">
              <span className="mb-1 block truncate text-[11px] font-medium text-muted-foreground">{f.label}</span>
              <select className={selectCls} value={toStr(draft, f.key)} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">Not sure</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          ))}
          <label className="min-w-0">
            <span className="mb-1 block truncate text-[11px] font-medium text-muted-foreground">Fire button size (%)</span>
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={200}
              placeholder="Not sure"
              className={selectCls}
              value={draft.fireButtonSize ?? ''}
              onChange={(e) => set('fireButtonSize', e.target.value)}
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" variant="outline" onClick={() => void onSave()} disabled={status === 'saving' || profile.isLoading}>
            {status === 'saving' ? <Spinner /> : status === 'saved' ? <Check /> : null}
            {status === 'saved' ? 'Saved' : 'Save answers'}
          </Button>
          {status === 'error' ? (
            <span className="text-[11px] text-destructive">
              {draft.fireButtonSize !== null && (draft.fireButtonSize < 10 || draft.fireButtonSize > 200) ? 'Fire button size must be 10–200.' : 'Could not save. Please try again.'}
            </span>
          ) : null}
        </div>
      </div>
    </details>
  );
}
