import { Link } from '@tanstack/react-router';
import { ArrowRight, FileText, History, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import type { AppUser } from '../backend/user';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BrandMark } from './giq/primitives';

interface AppHeaderProps {
  user: AppUser | null;
  authReady: boolean;
  savedCount: number;
  onHome: () => void;
  onOpenHistory: () => void;
  onGetStarted: () => void;
  onSignOut: () => void;
}

export function AppHeader({ user, authReady, savedCount, onHome, onOpenHistory, onGetStarted, onSignOut }: AppHeaderProps) {
  const initial = (user?.displayName || user?.email || 'P').charAt(0).toUpperCase();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          aria-label="Gaming IQ home"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark />
        </button>

        {!authReady ? (
          <div className="size-9 shrink-0 rounded-full skeleton" aria-hidden="true" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Profile menu"
                className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-sm font-semibold transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  initial
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-60">
              <DropdownMenuLabel className="font-normal">
                <div className="truncate text-sm font-medium">{user.displayName || 'Player'}</div>
                {user.email ? <div className="truncate text-xs text-muted-foreground">{user.email}</div> : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onOpenHistory} className="py-2">
                <History className="size-4" />
                <span className="flex-1">History</span>
                {savedCount > 0 ? (
                  <span className="rounded bg-secondary px-1.5 font-mono text-[10px] text-muted-foreground ring-1 ring-border">{savedCount}</span>
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="py-2">
                <Link to="/upgrade">
                  <Sparkles className="size-4" /> Upgrade Plan
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="py-2">
                <Link to="/terms">
                  <FileText className="size-4" /> Terms of Service
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="py-2">
                <Link to="/privacy">
                  <ShieldCheck className="size-4" /> Privacy Policy
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onSignOut} className="py-2">
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" onClick={onGetStarted} className="shrink-0">
            Get Started <ArrowRight />
          </Button>
        )}
      </div>
    </header>
  );
}
