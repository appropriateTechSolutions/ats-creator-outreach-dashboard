import { logger } from '../../lib/logger';
import { dismissOverlay } from '../../lib/a11y';
import { hasRole, ROLE_GROUPS, APP_NAME } from '../../lib/constants';
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
  ChevronDown,
  UserCheck,
  Handshake,
  Package,
  Image as ImageIcon,
  TrendingUp,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useIsDesktop } from '../../hooks/useMediaQuery';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  /** Toggle open/collapsed — used by the rail's hamburger to expand it. */
  onToggle: () => void;
}

export function Sidebar({ isOpen, onClose, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const isDesktop = useIsDesktop();
  // Desktop + closed = collapsed icon rail (not fully hidden as on mobile).
  const collapsed = isDesktop && !isOpen;
  const [clientName, setClientName] = useState<string>(APP_NAME);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (user?.user_type === 'client' && user?.client_id) {
      const cachedName = localStorage.getItem('client_name');
      if (cachedName) setClientName(cachedName);

      import('../../lib/api').then((api) => {
        api
          .getBrands()
          .then((brandsData) => {
            if (brandsData && brandsData.length > 0) {
              const name = brandsData[0]?.Client?.name || APP_NAME;
              setClientName(name);
              localStorage.setItem('client_name', name);
            }
          })
          .catch((err) => logger.error('Failed to load client name in sidebar', err));
      });
    }
  }, [user]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <BarChart3 size={20} /> },
    { name: 'Clients', path: '/clients', icon: <Building2 size={20} />, internalOnly: true },
    { name: 'Brands', path: '/brands', icon: <Briefcase size={20} /> },
    { name: 'Campaigns', path: '/campaigns', icon: <Target size={20} /> },
    { name: 'Creators', path: '/creators', icon: <Users size={20} /> },
    { name: 'My Creators', path: '/my-creators', icon: <UserCheck size={20} /> },
    { name: 'Partnerships', path: '/partnerships', icon: <Handshake size={20} /> },
    { name: 'Shipments', path: '/shipments', icon: <Package size={20} /> },
    { name: 'Content', path: '/content', icon: <ImageIcon size={20} /> },
    { name: 'Analytics', path: '/analytics', icon: <TrendingUp size={20} /> },
    { name: 'Review Queue', path: '/review', icon: <CheckSquare size={20} />, internalOnly: true },
    { name: 'Conversations', path: '/conversations', icon: <MessageSquare size={20} /> },
    { name: 'Meetings', path: '/meetings', icon: <Calendar size={20} /> },
    { name: 'Affiliate Performance', path: '/affiliate', icon: <Activity size={20} /> },
    { name: 'Users', path: '/users', icon: <Users size={20} />, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter((item) => {
    const isInternal = hasRole(user?.role, ROLE_GROUPS.INTERNAL);

    // Admin only pages (Manage Users)
    if (item.adminOnly && !hasRole(user?.role, ROLE_GROUPS.MANAGE_USERS)) {
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
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" {...dismissOverlay(onClose)} />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed left-0 top-0 bottom-0 bg-gray-50/30 backdrop-blur-xl border-r border-gray-200/60 shadow-soft
          flex flex-col z-40 transition-all duration-300 ease-in-out
          ${collapsed ? 'w-20' : 'w-64'}
          ${isOpen || collapsed ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar Header: Hamburger + Brand */}
        <div
          className={`p-4 flex items-center border-b border-gray-100 mb-2 h-16 ${
            collapsed ? 'justify-center' : 'gap-3'
          }`}
        >
          <button
            onClick={onToggle}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand menu' : undefined}
          >
            <Menu size={20} />
          </button>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="font-normal text-gray-900 tracking-tight text-sm font-outfit uppercase">
                {clientName}
              </span>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <div className={`py-2 flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-4'}`}>
          {!collapsed && (
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3">
              Menu
            </div>
          )}
          <nav className="space-y-1">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                title={collapsed ? item.name : undefined}
                aria-label={collapsed ? item.name : undefined}
                onClick={() => {
                  if (!isDesktop) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center rounded-xl transition-all duration-200 text-sm font-medium ${
                    collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? `bg-white shadow-soft text-primary-700 border border-gray-200/50 ${
                          collapsed ? '' : 'translate-x-1'
                        }`
                      : 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={isActive ? 'text-primary-600' : 'text-gray-400'}>
                      {item.icon}
                    </div>
                    {!collapsed && item.name}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Profile Footer with Dropdown */}
        <div className="relative border-t border-gray-200 bg-gray-50" ref={menuRef}>
          {!collapsed && menuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-gray-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] py-1 z-50 animate-[fadeIn_0.1s_ease]">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium transition-colors"
              >
                <LogOut size={16} />{' '}
                <span className="font-normal uppercase tracking-widest text-[10px]">Logout</span>
              </button>
            </div>
          )}

          <button
            onClick={() => (collapsed ? onToggle() : setMenuOpen(!menuOpen))}
            title={collapsed ? user?.full_name || 'Account' : undefined}
            aria-label={collapsed ? 'Expand sidebar to access account menu' : undefined}
            className={`w-full p-4 flex items-center hover:bg-gray-100 transition-colors cursor-pointer group ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-sm uppercase ring-2 ring-transparent group-hover:ring-primary-200 transition-all">
                {user?.full_name?.substring(0, 2) || 'US'}
              </div>
              {!collapsed && (
                <div className="text-left overflow-hidden">
                  <div className="text-sm font-normal text-gray-700 leading-tight font-outfit uppercase tracking-tight truncate max-w-[110px]">
                    {user?.full_name || 'Admin User'}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5 truncate max-w-[110px]">
                    {user?.role?.replace('client_', '').replace('_', ' ') || 'Role'}
                  </div>
                </div>
              )}
            </div>
            {!collapsed && (
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
              />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
