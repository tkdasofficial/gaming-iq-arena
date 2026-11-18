import { Check, Copy, LogIn, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import type { AppUser } from '../backend/user';
import { BrandMark } from './giq/primitives';
import { NAV_ITEMS } from './BottomNav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type NavTab = 'calibrate' | 'presets' | 'aim-lab' | 'saved';

interface TopNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onCopySetup: () => void;
  copied: boolean;
  savedCount: number;
  user: AppUser | null;
  authReady: boolean;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

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
  const shortName = user?.displayName?.split(' ')[0] || 'Player';

  return (
    <header className="glass sticky top-0 z-30 border-b border-border">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 md:h-16">
        <button
          type="button"
          onClick={() => onSelectTab('calibrate')}
          aria-label="Gaming IQ home"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark />
        </button>

        <nav aria-label="Primary navigation" className="hidden justify-center md:flex">
          <div className="flex items-center gap-1 rounded-2xl border border-border bg-card/70 p-1">
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectTab(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="top-nav-pill"
                      className="absolute inset-0 rounded-xl border border-border-strong bg-secondary"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  ) : null}
                  <Icon className={cn('relative size-4', isActive && 'text-primary')} />
                  <span className="relative">{label}</span>
                  {id === 'saved' && savedCount > 0 ? (
                    <span className="relative rounded-full bg-primary px-1.5 font-mono text-[10px] font-bold leading-4 text-primary-foreground">
                      {savedCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>
        <div className="md:hidden" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopySetup}
            aria-label={copied ? 'Copied' : 'Copy current setup'}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-all active:scale-95',
              copied
                ? 'border-success/50 bg-success/10 text-success'
                : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            <span className="hidden lg:inline">{copied ? 'Copied' : 'Copy setup'}</span>
          </button>

          {!authReady ? (
            <span className="skeleton size-10 rounded-xl" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-secondary p-1 pr-1 transition-colors hover:border-border-strong sm:pr-3"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="size-8 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="grid size-8 place-items-center rounded-lg bg-gradient-primary text-sm font-bold text-primary-foreground">
                      {shortName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="hidden max-w-[96px] truncate text-sm font-semibold sm:inline">{shortName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border-strong bg-popover p-1.5">
                <DropdownMenuLabel className="px-2.5 py-2">
                  <div className="truncate text-sm font-semibold">{user.displayName || shortName}</div>
                  {user.email ? (
                    <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={onSignOut}
                  className="h-10 rounded-xl px-2.5 text-sm text-primary focus:bg-primary/10 focus:text-primary"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={signingIn}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              <LogIn className="size-4" />
              <span>{signingIn ? 'Opening…' : 'Sign in'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
