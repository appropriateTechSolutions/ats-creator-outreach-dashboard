import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Target, 
  Users, 
  CheckSquare, 
  Send, 
  MessageSquare, 
  Calendar,
  Activity,
  Menu,
  Building2,
  Briefcase,
  Layout
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <BarChart3 size={20} /> },
    { name: 'Clients', path: '/clients', icon: <Building2 size={20} />, internalOnly: true },
    { name: 'Brands', path: '/brands', icon: <Briefcase size={20} /> },
    { name: 'Campaigns', path: '/campaigns', icon: <Target size={20} /> },
    { name: 'Creators', path: '/creators', icon: <Users size={20} /> },
    { name: 'Review Queue', path: '/review', icon: <CheckSquare size={20} />, internalOnly: true },
    { name: 'Outreach', path: '/outreach', icon: <Send size={20} /> },
    { name: 'Conversations', path: '/conversations', icon: <MessageSquare size={20} /> },
    { name: 'Meetings', path: '/meetings', icon: <Calendar size={20} /> },
    { name: 'Users', path: '/users', icon: <Users size={20} />, adminOnly: true },
    { name: 'Automation Logs', path: '/automation-logs', icon: <Activity size={20} />, internalOnly: true },
    { name: 'System Templates', path: '/templates', icon: <Layout size={20} />, internalOnly: true },
    { name: 'Analytics', path: '/analytics', icon: <Activity size={20} /> },
  ];

  const filteredNavItems = navItems.filter(item => {
    const isInternal = ['super_admin', 'admin', 'operator', 'analyst'].includes(user?.role || '');
    
    // Admin only pages (Manage Users)
    if (item.adminOnly && !['super_admin', 'admin', 'client_admin'].includes(user?.role || '')) {
      return false;
    }

    // Internal only pages (Review Queue)
    if (item.internalOnly && !isInternal) {
      return false;
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
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
              <Activity size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight text-sm">
              ATS Outreach
            </span>
          </div>
        </div>

        {/* Nav Items */}
        <div className="px-4 py-2 flex-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">
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
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${
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
      </aside>
    </>
  );
}
