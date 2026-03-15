'use client';

'use client';

import { useAuth } from '@/hooks/use-auth';

export function UserMenu() {
  const user = useAuth();

  return (
    <div className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-800">
      <p className="font-medium">{user?.name ?? 'Usuario'}</p>
      <p className="text-xs text-slate-500">{user?.email ?? 'sem-email'}</p>
    </div>
  );
}
