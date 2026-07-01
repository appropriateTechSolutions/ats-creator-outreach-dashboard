import { Menu } from 'lucide-react';

interface TopbarProps {
  onMenuToggle: () => void;
  sidebarOpen: boolean;
}

export function Topbar({ onMenuToggle, sidebarOpen }: TopbarProps) {
  return (
    <header className="h-16 glass px-4 flex items-center justify-between z-10 sticky top-0 gap-4">
      {/* Left: Hamburger — mobile only. On desktop the sidebar (full or the
          collapsed icon rail) always shows its own toggle, so hiding this here
          avoids a duplicate hamburger next to the rail. */}
      <div className="flex-1 flex items-center justify-start min-w-[40px]">
        {!sidebarOpen && (
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
