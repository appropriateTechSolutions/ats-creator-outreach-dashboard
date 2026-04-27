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
  Activity
} from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <BarChart3 size={20} /> },
    { name: 'Campaigns', path: '/campaigns', icon: <Target size={20} /> },
    { name: 'Creators', path: '/creators', icon: <Users size={20} /> },
    { name: 'Review Queue', path: '/review', icon: <CheckSquare size={20} /> },
    { name: 'Outreach', path: '/outreach', icon: <Send size={20} /> },
    { name: 'Conversations', path: '/conversations', icon: <MessageSquare size={20} /> },
    { name: 'Meetings', path: '/meetings', icon: <Calendar size={20} /> },
    { name: 'Analytics', path: '/analytics', icon: <Activity size={20} /> },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col z-20">
      <div className="p-6 flex items-center gap-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <Activity size={18} className="text-white" />
        </div>
        <span className="font-bold text-gray-900 tracking-tight">ATS Outreach</span>
      </div>
      
      <div className="px-4 py-6 flex-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Main Menu</div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
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
  );
}
