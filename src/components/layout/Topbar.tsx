import { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut, Menu, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TopbarProps {
  onMenuToggle: () => void;
  sidebarOpen: boolean;
}

export function Topbar({ onMenuToggle, sidebarOpen }: TopbarProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between z-10 sticky top-0 gap-4">

      {/* Left: Hamburger (only when sidebar is closed) */}
      <div className="flex items-center flex-shrink-0 min-w-[40px]">
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
      <div className="flex-1 flex justify-center px-0 sm:px-4">
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
      <div className="flex items-center gap-4 flex-shrink-0">
        <button className="relative text-gray-500 hover:text-gray-700 transition-colors">
          <Bell size={20} />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 cursor-pointer group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-xs ring-2 ring-transparent group-hover:ring-primary-100 transition-all uppercase">
              {user?.full_name?.substring(0, 2) || 'US'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-normal text-gray-700 leading-tight font-outfit uppercase tracking-tight">{user?.full_name || 'Admin User'}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">{user?.role || 'Role'}</div>
            </div>
            <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 hidden md:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 animate-[fadeIn_0.1s_ease]">
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50 flex items-center gap-2 font-medium"
              >
                <LogOut size={16} /> <span className="font-normal uppercase tracking-widest text-[10px]">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
