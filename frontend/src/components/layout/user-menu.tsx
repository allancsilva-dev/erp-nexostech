'use client';

import { useState } from 'react';
import { ChevronDown, LogOut, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const AUTH_LOGOUT_URL = 'https://auth.zonadev.tech/logout?redirect=https://erp.zonadev.tech';

export function UserMenu() {
  const user = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu className="relative">
      <Button
        type="button"
        variant="outline"
        className="h-auto min-w-[180px] justify-between px-3 py-2"
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="flex min-w-0 items-center gap-2 text-left">
          <UserCircle2 className="h-4 w-4 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user?.name ?? 'Usuario'}</span>
            <span className="block truncate text-xs text-slate-500">{user?.email ?? 'sem-email'}</span>
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </Button>

      {open ? (
        <DropdownMenuContent className="absolute right-0 top-12 z-50 dark:border-slate-700 dark:bg-slate-900">
          <DropdownMenuItem
            type="button"
            className="flex items-center gap-2 text-red-600 dark:hover:bg-slate-800"
            onClick={() => {
              setOpen(false);
              window.location.href = AUTH_LOGOUT_URL;
            }}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}
