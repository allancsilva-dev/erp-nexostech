'use client';

import { ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useAuthContext } from '@/providers/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  const user = useAuth();
  const { logout } = useAuthContext();
  const email = user?.email ?? 'usuario@nexos.local';

  return (
    <Dropdown
      trigger={
        <Button
          type="button"
          variant="outline"
          className="h-auto min-w-[180px] justify-between px-3 py-2"
          aria-label="Abrir menu do usuario"
        >
          <span className="flex min-w-0 items-center gap-2 text-left">
            <Avatar name={email} className="h-7 w-7" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{email}</span>
              <span className="block truncate text-xs text-[hsl(var(--muted-foreground))]">Conta ativa</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      }
      align="right"
    >
      <DropdownItem
        type="button"
        danger
        onClick={async () => {
          await logout();
        }}
        aria-label="Terminar sessao"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </DropdownItem>
    </Dropdown>
  );
}
