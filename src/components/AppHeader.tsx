import { LogIn, LogOut } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { BrandMark } from './giq/primitives';

export type NavTab = 'generate' | 'saved';

interface AppHeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  savedCount: number;
  user: AppUser | null;
  authReady: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const TABS: { id: NavTab; label: string }[] = [
  { id: 'generate', label: 'Generate' },
  { id: 'saved', label: 'Saved' },
];

export function AppHeader({ activeTab, onSelectTab, savedCount, user, authReady, onSignIn, onSignOut }: AppHeaderProps) {
  const initial = (user?.displayName || user?.email || 'P').charAt(0).toUpperCase();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={() => onSelectTab('generate')} aria-label="Gaming IQ home" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandMark className="[&>span:last-child]:hidden min-[400px]:[&>span:last-child]:inline" />
        </button>

        <nav aria-label="Main" className="ml-auto flex items-center gap-1 sm:ml-6 sm:mr-auto">
          {TABS.map((t) => {
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelectTab(t.id)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
                {t.id === 'saved' && savedCount > 0 ? (
                  <span className="rounded bg-background px-1 font-mono text-[10px] text-muted-foreground ring-1 ring-border">{savedCount}</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {!authReady ? (
          <div className="size-8 shrink-0 rounded-full skeleton" aria-hidden="true" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {user.photoURL ? <img src={user.photoURL} alt="" className="size-full object-cover" referrerPolicy="no-referrer" /> : initial}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="truncate text-sm font-medium">{user.displayName || 'Player'}</div>
                {user.email ? <div className="truncate text-xs text-muted-foreground">{user.email}</div> : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onSignOut}>
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" size="sm" onClick={onSignIn} className="shrink-0">
            <LogIn /> Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
