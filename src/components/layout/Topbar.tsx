import { Search, Bell, Menu } from 'lucide-react';

interface TopbarProps {
  onMenuToggle: () => void;
  sidebarOpen: boolean;
}

export function Topbar({ onMenuToggle, sidebarOpen }: TopbarProps) {

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between z-10 sticky top-0 gap-4">

      {/* Left: Hamburger (only when sidebar is closed) */}
      <div className="flex-1 flex items-center justify-start min-w-[40px]">
        {!sidebarOpen && (
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      {/* Center: Search bar */}
      <div className="flex-[2] flex justify-center px-0 sm:px-4">
        <div className="relative w-full max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-gray-400 sm:size-[16px]" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="block w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 transition-all focus:bg-white"
          />
        </div>
      </div>

      {/* Right: Bell + User */}
      <div className="flex-1 flex items-center justify-end gap-4 min-w-[40px]">
        <button className="relative text-gray-500 hover:text-gray-700 transition-colors">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}
