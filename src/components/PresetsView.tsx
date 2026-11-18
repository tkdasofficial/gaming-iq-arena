import { useMemo, useState } from 'react';
import { ArrowRight, Globe, Plus, Trash2 } from 'lucide-react';
import type { GameId, ProPreset } from '../engine/types';

interface PresetsViewProps {
  presets: ProPreset[];
  loaded: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  onApplyPreset: (preset: ProPreset) => void;
  onDeletePreset: (presetId: string) => Promise<void>;
  onGoToCalibrate: () => void;
  onRequestSignIn: () => void;
}

type FilterOption = 'all' | GameId;

export function PresetsView({
  presets,
  loaded,
  currentUserId,
  isAdmin,
  onApplyPreset,
  onDeletePreset,
  onGoToCalibrate,
  onRequestSignIn,
}: PresetsViewProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPresets = useMemo(() => {
    if (filter === 'all') return presets;
    return presets.filter((p) => p.game === filter);
  }, [filter, presets]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeletePreset(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Community Presets
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA]">
            Live configurations published by verified Gaming IQ players.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Buttons */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#141417] border border-[#29292F] rounded-xl sm:w-auto">
            {(
              [
                { id: 'all', label: 'All Games' },
                { id: 'free-fire', label: 'Free Fire' },
                { id: 'pubg-bgmi', label: 'BGMI' },
              ] as const
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#F0263C] text-white'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!loaded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-56 rounded-xl bg-[#141417] border border-[#29292F] animate-pulse"
            />
          ))}
        </div>
      ) : filteredPresets.length === 0 ? (
        <div className="bg-[#141417] border border-[#29292F] rounded-xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#111114] border border-[#29292F] flex items-center justify-center mx-auto">
            <Globe className="w-6 h-6 text-[#F0263C]" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold text-white">
              No Presets Published Yet
            </h2>
            <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
              Generate a sensitivity profile in the Calibrator and click Publish Preset to share it to the cloud catalog.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGoToCalibrate}
              className="min-h-[48px] px-5 rounded-xl bg-[#F0263C] hover:bg-[#B8172A] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Calibrate & Publish</span>
            </button>
            {!currentUserId ? (
              <button
                type="button"
                onClick={onRequestSignIn}
                className="min-h-[48px] px-5 rounded-xl bg-[#1B1B20] hover:bg-[#29292F] border border-[#29292F] text-white text-sm font-semibold transition-colors"
              >
                Sign In
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPresets.map((preset) => {
            const gameLabel =
              preset.game === 'free-fire'
                ? 'Garena Free Fire'
                : 'BGMI (Battlegrounds Mobile India)';
            const canDelete =
              Boolean(currentUserId) && (preset.authorId === currentUserId || isAdmin);

            return (
              <article
                key={preset.id}
                className="bg-[#141417] border border-[#29292F] rounded-xl p-5 flex flex-col justify-between gap-5 hover:border-[#3F3F46] transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-[#A1A1AA] font-medium">
                      <span className="text-[#F0263C] font-semibold">{gameLabel}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{preset.claw}</span>
                      {preset.game === 'pubg-bgmi' ? (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="capitalize">
                            {preset.gyro.replace('-', ' ')} Gyro
                          </span>
                        </>
                      ) : null}
                    </div>

                    {canDelete ? (
                      <button
                        type="button"
                        disabled={deletingId === preset.id}
                        onClick={() => void handleDelete(preset.id)}
                        aria-label={`Delete ${preset.name}`}
                        className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-[#71717A] hover:text-[#F0263C] hover:bg-[#111114] transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>

                  <div>
                    <h2 className="font-display text-2xl font-bold text-white tracking-tight">
                      {preset.name}
                    </h2>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">
                      {preset.playerArchetype} · by {preset.authorName}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#111114] border border-[#29292F] font-mono text-xs font-semibold text-white tabular-nums">
                    {preset.headlineMetric}
                  </div>

                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onApplyPreset(preset)}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-[#1B1B20] hover:bg-[#F0263C] border border-[#29292F] hover:border-[#F0263C] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <span>Apply Preset</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
