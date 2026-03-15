'use client';

import { Building2 } from 'lucide-react';
import { useBranch } from '@/hooks/use-branch';

export function BranchSwitcher() {
  const { activeBranch, branches, switchBranch } = useBranch();

  if (branches.length <= 1) {
    return null;
  }

  return (
    <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-800">
      <Building2 className="h-4 w-4" />
      <select
        className="bg-transparent outline-none"
        value={activeBranch?.id ?? ''}
        onChange={(event) => switchBranch(event.target.value)}
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}{branch.isHeadquarters ? ' (Matriz)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
