import { Bookmark, Crosshair, Layers, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import type { NavTab } from './TopNav';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  savedCount: number;
}

export const NAV_ITEMS: { id: NavTab; label: string; Icon: typeof SlidersHorizontal }[] = [
  { id: 'calibrate', label: 'Calibrate', Icon: SlidersHorizontal },
  { id: 'presets', label: 'Presets', Icon: Layers },
  { id: 'aim-lab', label: 'Aim Lab', Icon: Crosshair },
  { id: 'saved', label: 'Saved', Icon: Bookmark },
];

export function BottomNav({ activeTab, onSelectTab, savedCount }: BottomNavProps) {
  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe md:hidden">
      <div className="glass mx-auto mb-3 grid h-[68px] max-w-md grid-cols-4 gap-1 rounded-[24px] border border-border-strong p-1.5 shadow-float">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 rounded-[18px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                isActive ? 'text-foreground' : 'text-subtle active:text-foreground'
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className="absolute inset-0 rounded-[18px] border border-border-strong bg-secondary"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              ) : null}
              <span className="relative">
                <Icon className={cn('size-[22px] transition-transform', isActive && 'scale-110 text-primary')} />
                {id === 'saved' && savedCount > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-primary px-1 text-center font-mono text-[9px] font-bold leading-4 text-primary-foreground">
                    {savedCount}
                  </span>
                ) : null}
              </span>
              <span className="relative text-[10.5px] font-semibold leading-none tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
