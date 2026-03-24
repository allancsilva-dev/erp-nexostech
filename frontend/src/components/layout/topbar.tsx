'use client';

import { BranchSwitcher } from '@/components/layout/branch-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useAuthContext } from '@/providers/auth-provider';

function getInitials(nameOrEmail?: string | null): string {
  if (!nameOrEmail) {
    return 'US';
  }

  const safeValue = nameOrEmail.trim();
  if (!safeValue) {
    return 'US';
  }

  if (safeValue.includes('@')) {
    const local = safeValue.split('@')[0] ?? '';
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }

    return local.slice(0, 2).toUpperCase();
  }

  const chunks = safeValue.split(/\s+/).filter(Boolean);
  if (chunks.length >= 2) {
    return `${chunks[0][0] ?? ''}${chunks[1][0] ?? ''}`.toUpperCase();
  }

  return safeValue.slice(0, 2).toUpperCase();
}

export function Topbar() {
  const { user } = useAuthContext();
  const userName = (user as { name?: string } | null)?.name;
  const identity = userName || user?.email || 'Utilizador';

  return (
    <header
      className="flex h-[var(--topbar-height)] items-center justify-between border-b px-4 md:px-6"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <BranchSwitcher />

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
