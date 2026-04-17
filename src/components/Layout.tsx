import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
  userName?: string
  onLogout?: () => void
}

const navItems = [{ label: 'Campaigns', path: '/', icon: 'campaign' }]

function getPageLabel(pathname: string): string {
  if (pathname.startsWith('/campaigns/')) {
    return 'Campaign detail'
  }

  return 'Campaigns'
}

export default function Layout({ children, userName, onLogout }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const pageLabel = getPageLabel(location.pathname)

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <header className="sticky top-0 z-40 border-b border-outline-variant/60 bg-surface-container-lowest/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <div className="text-xs font-medium text-on-surface-variant">ATS Outreach</div>
            <div className="truncate text-sm font-medium text-on-surface">{pageLabel}</div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const active = location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/campaigns'))

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={active ? 'btn-secondary' : 'btn-ghost'}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            {userName && <span className="hidden text-sm text-on-surface-variant sm:block">{userName}</span>}
            {onLogout && (
              <button onClick={onLogout} className="btn-ghost">
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/60 bg-surface-container-lowest/95 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-around px-3 py-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/campaigns'))

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={active ? 'btn-secondary min-w-[140px]' : 'btn-ghost min-w-[140px]'}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
