import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Target, 
  Users, 
  CheckSquare, 
  MessageSquare, 
  Calendar,
  Activity,
  Menu,
  Building2,
  Briefcase,
  LogOut,
  ChevronUp,
  Handshake,
  Package,
  Image as ImageIcon
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const [clientName, setClientName] = useState<string>('ATS Outreach');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (user?.user_type === 'client' && user?.client_id) {
      import('../../lib/api').then((api) => {
        api.getBrands().then((brandsData) => {
          if (brandsData && brandsData.length > 0) {
            const name = brandsData[0]?.Client?.name || 'ATS Outreach';
            setClientName(name);
          }
        }).catch((err) => console.error('Failed to load client name in sidebar', err));
      });
    }
  }, [user]);
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <BarChart3 size={20} /> },
    { name: 'Clients', path: '/clients', icon: <Building2 size={20} />, internalOnly: true },
    { name: 'Brands', path: '/brands', icon: <Briefcase size={20} /> },
    { name: 'Campaigns', path: '/campaigns', icon: <Target size={20} /> },
    { name: 'Creators', path: '/creators', icon: <Users size={20} /> },
    { name: 'My Creators', path: '/my-creators', icon: <Users size={20} /> },
    { name: 'Partnerships', path: '/partnerships', icon: <Handshake size={20} /> },
    { name: 'Shipments', path: '/shipments', icon: <Package size={20} /> },
    { name: 'Content', path: '/content', icon: <ImageIcon size={20} /> },
    { name: 'Review Queue', path: '/review', icon: <CheckSquare size={20} />, internalOnly: true },
    { name: 'Conversations', path: '/conversations', icon: <MessageSquare size={20} /> },
    { name: 'Meetings', path: '/meetings', icon: <Calendar size={20} /> },
    { name: 'Affiliate Performance', path: '/affiliate', icon: <Activity size={20} /> },
    { name: 'Users', path: '/users', icon: <Users size={20} />, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(item => {
    const isInternal = ['super_admin', 'admin', 'operator', 'analyst'].includes(user?.role || '');
    
    // Admin only pages (Manage Users)
    if (item.adminOnly && !['super_admin', 'admin', 'client_admin'].includes(user?.role || '')) {
      return false;
    }

    // Internal only pages (Review Queue)
    if (item.internalOnly && !isInternal) {
      if (item.path === '/review' && user?.role === 'client_admin') {
        // Allow client_admin for review queue
      } else {
        return false;
      }
    }

    return true;
  });

  return (
    <>
      {/* Overlay — mobile only when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 shadow-sm
          flex flex-col z-40 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar Header: Hamburger + Brand */}
        <div className="p-4 flex items-center gap-3 border-b border-gray-100 mb-2 h-16">
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-normal text-gray-900 tracking-tight text-sm font-outfit uppercase">
              {clientName}
            </span>
          </div>
        </div>

        {/* Nav Items */}
        <div className="px-4 py-2 flex-1 overflow-y-auto">
          <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-4 px-2">
            Main Menu
          </div>
          <nav className="space-y-1">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-normal text-sm ${
                    isActive 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={isActive ? 'text-primary-600' : 'text-gray-400'}>
                      {item.icon}
                    </div>
                    {item.name}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Profile Footer with Dropdown */}
        <div className="relative border-t border-gray-200 bg-gray-50" ref={menuRef}>
          {menuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-gray-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] py-1 z-50 animate-[fadeIn_0.1s_ease]">
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium transition-colors"
              >
                <LogOut size={16} /> <span className="font-normal uppercase tracking-widest text-[10px]">Logout</span>
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-sm uppercase ring-2 ring-transparent group-hover:ring-primary-200 transition-all">
                {user?.full_name?.substring(0, 2) || 'US'}
              </div>
              <div className="text-left overflow-hidden">
                <div className="text-sm font-normal text-gray-700 leading-tight font-outfit uppercase tracking-tight truncate max-w-[110px]">{user?.full_name || 'Admin User'}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5 truncate max-w-[110px]">{user?.role?.replace('client_', '').replace('_', ' ') || 'Role'}</div>
              </div>
            </div>
            <ChevronUp size={16} className={`text-gray-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>
    </>
  );
}
