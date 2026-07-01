import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useIsDesktop } from '../../hooks/useMediaQuery';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);

  // Open on desktop, collapse on mobile — re-evaluated whenever the viewport
  // crosses the lg breakpoint, not just once at mount.
  useEffect(() => {
    setSidebarOpen(isDesktop);
  }, [isDesktop]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
      {/* Sidebar — fixed, slides over content on mobile, pushes on desktop */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main area — pushes on desktop (full or icon rail), overlays on mobile */}
      <div
        className={`
          flex flex-col flex-1 overflow-hidden min-w-0
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20 pl-0'}
        `}
      >
        <Topbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} sidebarOpen={sidebarOpen} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 md:p-8 relative outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
