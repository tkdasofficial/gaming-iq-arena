import { Check, Copy, LogIn, LogOut } from 'lucide-react';
import type { User } from 'firebase/auth';

export type NavTab = 'calibrate' | 'presets' | 'aim-lab' | 'saved';

interface TopNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onCopySetup: () => void;
  copied: boolean;
  savedCount: number;
  user: User | null;
  authReady: boolean;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: 'calibrate', label: 'Calibrate' },
  { id: 'presets', label: 'Presets' },
  { id: 'aim-lab', label: 'Aim Lab' },
  { id: 'saved', label: 'Saved' },
];

export function TopNav({
  activeTab,
  onSelectTab,
  onCopySetup,
  copied,
  savedCount,
  user,
  authReady,
  signingIn,
  onSignIn,
  onSignOut,
}: TopNavProps) {
  const shortName = user?.displayName?.split(' ')[0] || 'Account';

  return (
    <header className="sticky top-0 z-30 h-12 md:h-16 bg-[#0B0B0D]/95 backdrop-blur-md border-b border-[#29292F]">
      <div className="max-w-5xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('calibrate')}
          className="font-display text-xl md:text-2xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0263C] rounded"
        >
          Gaming <span className="text-[#F0263C]">IQ</span>
        </button>

        {/* Zone 2: Desktop nav links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0263C] rounded ${
                  isActive ? 'text-white' : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {item.label}
                {item.id === 'saved' && savedCount > 0 ? (
                  <span className="ml-1.5 font-mono text-xs text-[#71717A] tabular-nums">
                    ({savedCount})
                  </span>
                ) : null}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F0263C]"
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Quick actions + Google Auth */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCopySetup}
            className="min-h-[36px] md:min-h-[40px] px-3 md:px-3.5 py-1.5 rounded-lg bg-[#1B1B20] hover:bg-[#29292F] border border-[#29292F] text-white text-xs md:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0263C]"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#F0263C]" />
            ) : (
              <Copy className="w-4 h-4 text-[#A1A1AA]" />
            )}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy All'}</span>
            <span className="sm:hidden">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {authReady ? (
            user ? (
              <div className="flex items-center gap-1.5">
                <div className="hidden sm:flex items-center gap-2 px-2.5 min-h-[36px] md:min-h-[40px] rounded-lg bg-[#141417] border border-[#29292F]">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={shortName}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-[#F0263C] text-[10px] font-bold text-white flex items-center justify-center">
                      {shortName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-xs font-medium text-white max-w-[90px] truncate">
                    {shortName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="min-h-[36px] md:min-h-[40px] px-2.5 md:px-3 rounded-lg bg-[#141417] hover:bg-[#1B1B20] border border-[#29292F] text-[#A1A1AA] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={signingIn}
                className="min-h-[36px] md:min-h-[40px] px-3 md:px-3.5 rounded-lg bg-[#141417] hover:bg-[#1B1B20] border border-[#29292F] hover:border-[#F0263C] text-white text-xs md:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5 text-[#F0263C]" />
                <span>{signingIn ? 'Signing in...' : 'Sign In'}</span>
              </button>
            )
          ) : null}
        </div>
      </div>
    </header>
  );
}
