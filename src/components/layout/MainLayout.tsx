import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">

      {/* Sidebar — fixed, slides over content on mobile, pushes on desktop */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area — pushes on desktop, overlays on mobile */}
      <div
        className={`
          flex flex-col flex-1 overflow-hidden min-w-0
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'lg:pl-64' : 'pl-0'}
        `}
      >
        <Topbar onMenuToggle={() => setSidebarOpen(prev => !prev)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
