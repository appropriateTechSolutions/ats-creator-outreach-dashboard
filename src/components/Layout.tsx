import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
  userName?: string
  onLogout?: () => void
}

const navItems = [
  { icon: 'campaign', label: 'Campaigns', path: '/' },
]

export default function Layout({ children, userName, onLogout }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-20 flex-col items-center py-8 bg-surface-container-low z-50">
        <div className="flex flex-col gap-8">
          {navItems.map((item) => {
            const active = location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/campaigns'))
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`p-3 rounded-2xl transition-colors ${active ? 'text-primary bg-white shadow-sm' : 'text-outline hover:text-primary'}`}
                title={item.label}
              >
                <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Main content with sidebar offset on desktop */}
      <div className="md:pl-20">
        {/* Top App Bar */}
        <header className="sticky top-0 w-full z-40 bg-[#f8f9fa]/80 backdrop-blur-lg shadow-sm flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl editorial-gradient flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
            </div>
            <h1 className="font-headline font-extrabold text-slate-900 text-xl tracking-tight">ATS Outreach</h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`font-body text-sm transition-colors ${location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/campaigns')) ? 'text-primary font-bold' : 'text-slate-500 font-medium hover:text-primary'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {userName && (
              <span className="text-sm font-medium text-slate-600 hidden sm:block">{userName}</span>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-error hover:bg-error-container/20 transition-colors"
              >
                Logout
              </button>
            )}
            <div className="w-10 h-10 rounded-full editorial-gradient flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-3 bg-white/90 backdrop-blur-xl z-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {navItems.map((item) => {
          const active = location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/campaigns'))
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center px-4 py-1 rounded-xl ${active ? 'text-primary bg-blue-50' : 'text-slate-400'}`}
            >
              <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
              <span className="font-body text-[10px] font-bold uppercase tracking-widest mt-1">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
