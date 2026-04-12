"use client";

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  useEffect(() => {
    const persisted = localStorage.getItem('sidebar_visible');
    setIsSidebarVisible(persisted !== '0');
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar_visible', isSidebarVisible ? '1' : '0');
  }, [isSidebarVisible]);

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-app)' }}>
      <Sidebar isVisible={isSidebarVisible} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
