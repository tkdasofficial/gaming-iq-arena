import { Bookmark, Crosshair, Layers, SlidersHorizontal } from 'lucide-react';
import type { NavTab } from './TopNav';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  savedCount: number;
}

const TABS: {
  id: NavTab;
  label: string;
  Icon: typeof SlidersHorizontal;
}[] = [
  { id: 'calibrate', label: 'Calibrate', Icon: SlidersHorizontal },
  { id: 'presets', label: 'Presets', Icon: Layers },
  { id: 'aim-lab', label: 'Aim Lab', Icon: Crosshair },
  { id: 'saved', label: 'Saved', Icon: Bookmark },
];

export function BottomNav({ activeTab, onSelectTab, savedCount }: BottomNavProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0B0B0D]/95 backdrop-blur-md border-t border-[#29292F]"
    >
      <div className="grid grid-cols-4 h-full max-w-lg mx-auto">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F0263C] ${
                isActive ? 'text-white' : 'text-[#71717A] hover:text-white'
              }`}
            >
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-4 right-4 h-0.5 bg-[#F0263C]"
                />
              ) : null}
              <Icon
                className={`w-5 h-5 ${
                  isActive ? 'text-[#F0263C]' : 'text-[#71717A]'
                }`}
              />
              <span className="text-[11px] font-medium tracking-tight leading-none">
                {label}
                {id === 'saved' && savedCount > 0 ? ` (${savedCount})` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
