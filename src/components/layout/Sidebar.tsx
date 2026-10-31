import { logger } from '../../lib/logger';
import { dismissOverlay } from '../../lib/a11y';
import { hasRole, ROLE_GROUPS, APP_NAME } from '../../lib/constants';
import { Fragment, useState, useEffect, useRef, type ReactNode } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
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
  Send,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import type { AuthUser } from '../../types';

export interface NavItem {
  name: string;
  path: string;
  icon: ReactNode;
  internalOnly?: boolean;
  adminOnly?: boolean;
  /**
   * Other paths (prefixes, matched on whole segments) that keep this item active. For
   * pages that are routable but have no nav item of their own.
   */
  alsoActiveFor?: string[];
}

export interface NavGroup {
  /** Left off for the lead group (Dashboard), which renders without a heading. */
  heading?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { items: [{ name: 'Dashboard', path: '/dashboard', icon: <BarChart3 size={20} /> }] },
  {
    heading: 'Work',
    items: [
      { name: 'Inbox', path: '/conversations', icon: <MessageSquare size={20} /> },
      {
        name: 'Review Queue',
        path: '/review',
        icon: <CheckSquare size={20} />,
        internalOnly: true,
      },
      { name: 'Campaigns', path: '/campaigns', icon: <Target size={20} /> },
      { name: 'Creators', path: '/creators', icon: <Users size={20} /> },
      { name: 'My Creators', path: '/my-creators', icon: <UserCheck size={20} /> },
      { name: 'Outreach', path: '/outreach', icon: <Send size={20} /> },
    ],
  },
  {
    heading: 'Pipeline',
    items: [
      { name: 'Partnerships', path: '/partnerships', icon: <Handshake size={20} /> },
      { name: 'Shipments', path: '/shipments', icon: <Package size={20} /> },
      {
        name: 'Content',
        path: '/content',
        icon: <ImageIcon size={20} />,
        // "Deliverables by creator" lives at /analytics and is reached from Content.
        alsoActiveFor: ['/analytics'],
      },
      { name: 'Meetings', path: '/meetings', icon: <Calendar size={20} /> },
    ],
  },
  {
    heading: 'Insights',
    items: [{ name: 'Affiliate Performance', path: '/affiliate', icon: <Activity size={20} /> }],
  },
  {
    heading: 'Admin',
    items: [
      { name: 'Clients', path: '/clients', icon: <Building2 size={20} />, internalOnly: true },
      { name: 'Brands', path: '/brands', icon: <Briefcase size={20} /> },
      { name: 'Users', path: '/users', icon: <Users size={20} />, adminOnly: true },
    ],
  },
];

function isNavItemVisible(item: NavItem, role: string | null | undefined): boolean {
  // Admin only pages (Manage Users)
  if (item.adminOnly && !hasRole(role, ROLE_GROUPS.MANAGE_USERS)) {
    return false;
  }

  // Internal only pages (Clients, Review Queue)
  if (item.internalOnly && !hasRole(role, ROLE_GROUPS.INTERNAL)) {
    if (item.path === '/review' && role === 'client_admin') {
      // Allow client_admin for review queue
    } else {
      return false;
    }
  }

  return true;
}

/** Applies the per-item role flags, then drops any group left with nothing to show. */
function getVisibleNavGroups(groups: NavGroup[], user: AuthUser | null): NavGroup[] {
  const role = user?.role;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isNavItemVisible(item, role)),
    }))
    .filter((group) => group.items.length > 0);
}

/** True on the item's own path (and anything beneath it) or any of its `alsoActiveFor` paths. */
function isNavItemActive(item: NavItem, pathname: string): boolean {
  return [item.path, ...(item.alsoActiveFor ?? [])].some(
    (path) => matchPath({ path, end: false }, pathname) !== null,
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  /** Toggle open/collapsed — used by the rail's hamburger to expand it. */
  onToggle: () => void;
  /** Nav config; defaults to the app's groups. Overridable so tests can shape the nav. */
  navGroups?: NavGroup[];
}

export function Sidebar({ isOpen, onClose, onToggle, navGroups = NAV_GROUPS }: SidebarProps) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
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

  const visibleGroups = getVisibleNavGroups(navGroups, user);

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
              <span className="font-semibold text-primary-900 tracking-tight text-base font-outfit">
                {clientName}
              </span>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <div className={`py-2 flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-4'}`}>
          <nav aria-label="Main">
            {visibleGroups.map((group, index) => (
              <Fragment key={group.heading ?? 'lead'}>
                {/* The rail has no room for headings, so a hairline separates the groups. */}
                {collapsed && index > 0 && <hr className="my-3 border-gray-200" />}
                <div
                  role={group.heading ? 'group' : undefined}
                  aria-label={group.heading}
                  className={!collapsed && index > 0 ? 'mt-5' : undefined}
                >
                  {group.heading && !collapsed && (
                    <div
                      aria-hidden="true"
                      className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3"
                    >
                      {group.heading}
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = isNavItemActive(item, pathname);
                      return (
                        <Link
                          key={item.name}
                          to={item.path}
                          title={collapsed ? item.name : undefined}
                          aria-label={collapsed ? item.name : undefined}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => {
                            if (!isDesktop) onClose();
                          }}
                          className={`flex items-center rounded-xl transition-all duration-200 text-sm font-medium ${
                            collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5'
                          } ${
                            isActive
                              ? `bg-primary-900 text-primary-50 shadow-soft border border-primary-950/50 ${
                                  collapsed ? '' : 'translate-x-1'
                                }`
                              : 'text-gray-500 hover:bg-gray-100/70 hover:text-gray-900 border border-transparent'
                          }`}
                        >
                          <div className={isActive ? 'text-primary-200' : 'text-gray-400'}>
                            {item.icon}
                          </div>
                          {!collapsed && item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </Fragment>
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
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-800 flex flex-shrink-0 items-center justify-center font-outfit font-semibold text-sm uppercase ring-2 ring-transparent group-hover:ring-primary-300 transition-all">
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
