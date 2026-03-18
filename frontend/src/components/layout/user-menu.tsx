'use client';

import { useState } from 'react';
import { ChevronDown, LogOut, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://auth.zonadev.tech';

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
            onClick={async () => {
              setOpen(false);

              try {
                const res = await fetch(`${AUTH_URL}/auth/logout`, {
                  method: 'POST',
                  credentials: 'include',
                });

                const data = (await res.json()) as {
                  logoutUrls?: string[];
                };

                if (data.logoutUrls?.length) {
                  await Promise.allSettled(
                    data.logoutUrls.map((url) =>
                      fetch(url, { method: 'POST', credentials: 'include' }),
                    ),
                  );
                }
              } finally {
                window.location.href = `${AUTH_URL}/login?app=erp.zonadev.tech`;
              }
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
