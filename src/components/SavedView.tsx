import { Bookmark, Check, Copy, LogIn, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { formatDeviceFullName } from '../engine/devices';
import type { SavedSetup } from '../engine/types';

interface SavedViewProps {
  savedSetups: SavedSetup[];
  isSignedIn: boolean;
  authReady: boolean;
  onSignIn: () => void;
  onLoadSetup: (setup: SavedSetup) => void;
  onDeleteSetup: (id: string) => Promise<void>;
  onCopySetupObject: (setup: SavedSetup) => void;
  onGoToCalibrate: () => void;
}

export function SavedView({
  savedSetups,
  isSignedIn,
  authReady,
  onSignIn,
  onLoadSetup,
  onDeleteSetup,
  onCopySetupObject,
  onGoToCalibrate,
}: SavedViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCopy = (setup: SavedSetup) => {
    onCopySetupObject(setup);
    setCopiedId(setup.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteSetup(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Saved Profiles
        </h1>
        <p className="text-xs sm:text-sm text-[#A1A1AA]">
          Cloud-synced sensitivity setups stored securely in your Firestore account.
        </p>
      </div>

      {authReady && !isSignedIn ? (
        <div className="bg-[#141417] border border-[#29292F] rounded-xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#111114] border border-[#29292F] flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6 text-[#F0263C]" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold text-white">
              Sign In to Sync Saved Profiles
            </h2>
            <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
              All saved sensitivity profiles are stored in Firestore so your configurations stay available across every device.
            </p>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="min-h-[48px] px-5 rounded-xl bg-[#F0263C] hover:bg-[#B8172A] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>
        </div>
      ) : savedSetups.length === 0 ? (
        <div className="bg-[#141417] border border-[#29292F] rounded-xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#111114] border border-[#29292F] flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6 text-[#F0263C]" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold text-white">
              No Saved Setups Yet
            </h2>
            <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
              Generate a sensitivity configuration and click Save to Cloud to store it in Firestore.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToCalibrate}
            className="min-h-[48px] px-5 rounded-xl bg-[#F0263C] hover:bg-[#B8172A] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Open Calibrator</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedSetups.map((setup) => {
            const gameLabel =
              setup.input.game === 'free-fire'
                ? 'Garena Free Fire'
                : 'BGMI (Battlegrounds Mobile India)';
            const previewEntries = Object.entries(setup.sliders).slice(0, 3);
            const isCopied = copiedId === setup.id;

            return (
              <article
                key={setup.id}
                className="bg-[#141417] border border-[#29292F] rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-[#F0263C] font-semibold">
                        {gameLabel}
                      </div>
                      <h2 className="font-display text-2xl font-bold text-white truncate mt-0.5">
                        {setup.name}
                      </h2>
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === setup.id}
                      onClick={() => void handleDelete(setup.id)}
                      aria-label={`Delete ${setup.name}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#A1A1AA] hover:text-[#F0263C] hover:bg-[#111114] transition-colors shrink-0 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-[#A1A1AA]">
                    {formatDeviceFullName(setup.input.device.brand, setup.input.device.model)}
                    <span aria-hidden="true"> · </span>
                    {setup.input.claw}
                    <span aria-hidden="true"> · </span>
                    <span className="capitalize">
                      {setup.input.playstyle.replace('-', ' ')}
                    </span>
                    {setup.input.game === 'pubg-bgmi' ? (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>Gyro {setup.input.gyro}</span>
                      </>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {previewEntries.map(([key, val]) => (
                      <div
                        key={key}
                        className="p-2.5 rounded-lg bg-[#111114] border border-[#29292F]"
                      >
                        <div className="text-[11px] text-[#A1A1AA] truncate">
                          {key.replace(/^(ff-|cam-|ads-|gyro-|fl-)/, '').toUpperCase()}
                        </div>
                        <div className="font-mono text-base font-bold text-white tabular-nums">
                          {val}
                          {setup.input.game === 'pubg-bgmi' ? '%' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#29292F]">
                  <button
                    type="button"
                    onClick={() => onLoadSetup(setup)}
                    className="min-h-[44px] px-4 rounded-xl bg-white hover:bg-[#E4E4E7] text-black text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Load Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(setup)}
                    className="min-h-[44px] px-4 rounded-xl bg-[#1B1B20] border border-[#29292F] hover:border-[#F0263C] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#F0263C]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Setup</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
