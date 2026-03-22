'use client';

import { ChevronDown } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useBranchContext } from '@/providers/branch-provider';
import { useAuthContext } from '@/providers/auth-provider';

function getInitials(nameOrEmail?: string | null): string {
  if (!nameOrEmail) {
    return 'US';
  }

  const chunks = nameOrEmail.split(' ').filter(Boolean);
  if (chunks.length === 1) {
    return chunks[0].slice(0, 2).toUpperCase();
  }

  return `${chunks[0][0] ?? ''}${chunks[1][0] ?? ''}`.toUpperCase();
}

export function Topbar() {
  const { activeBranch } = useBranchContext();
  const { user } = useAuthContext();
  const identity = user?.email ?? 'Utilizador';

  return (
    <header
      className="flex h-[var(--topbar-height)] items-center justify-between border-b px-4 md:px-6"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm"
        style={{ color: 'var(--text-secondary)', background: 'transparent' }}
        aria-label="Filial ativa"
      >
        <span className="h-2 w-2 rounded-full" style={{ background: 'var(--success)' }} />
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {activeBranch?.name ?? 'Sem filial'}
        </span>
        <ChevronDown size={14} />
      </button>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: 'var(--accent)', color: '#fff' }}
          title={identity}
          aria-label={identity}
        >
          {getInitials(identity)}
        </div>
      </div>
    </header>
  );
}
