'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { BranchSwitcher } from '@/components/layout/branch-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import { Button } from '@/components/ui/button';

export function Header({
  isSidebarVisible,
  onToggleSidebar,
}: {
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden lg:inline-flex"
          onClick={onToggleSidebar}
          aria-label={isSidebarVisible ? 'Ocultar menu lateral' : 'Exibir menu lateral'}
        >
          {isSidebarVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
        <BranchSwitcher />
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
