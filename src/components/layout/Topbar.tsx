import { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Topbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between z-10 sticky top-0">
      <div className="flex-1 max-w-lg relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input 
          type="text" 
          placeholder="Search creators, campaigns, or #keywords..." 
          className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 transition-all focus:bg-white"
        />
      </div>

      <div className="flex items-center gap-6 ml-4">
        <button className="relative text-gray-500 hover:text-gray-700 transition-colors">
          <Bell size={20} />
          {/* <span className="absolute top-0 right-0 block w-2 h-2 rounded-full bg-error-500 ring-2 ring-white"></span> */}
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 cursor-pointer group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-bold text-xs ring-2 ring-transparent group-hover:ring-primary-100 transition-all uppercase">
              {user?.full_name?.substring(0, 2) || 'US'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-semibold text-gray-700 leading-tight">{user?.full_name || 'Admin User'}</div>
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
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
