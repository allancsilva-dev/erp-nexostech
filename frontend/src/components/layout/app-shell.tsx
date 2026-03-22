"use client";

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

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
    <div className="flex min-h-screen bg-[hsl(var(--content-bg))] text-[hsl(var(--foreground))]">
      <Sidebar isVisible={isSidebarVisible} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          isSidebarVisible={isSidebarVisible}
          onToggleSidebar={() => setIsSidebarVisible((prev) => !prev)}
        />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
