'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { useBranch } from '@/hooks/use-branch';
import { Select } from '@/components/ui/select';

export function BranchSwitcher() {
  const { activeBranch, branches, switchBranch, isLoading } = useBranch();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingBranchId, setPendingBranchId] = useState(activeBranch?.id ?? '');
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    setPendingBranchId(activeBranch?.id ?? '');
  }, [activeBranch?.id]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (branches.length <= 1) {
    return null;
  }

  function onSelectBranch(branchId: string): void {
    setPendingBranchId(branchId);
    setIsSwitching(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      switchBranch(branchId);
      setIsSwitching(false);
    }, 250);
  }

  return (
    <label className="flex min-w-[220px] items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm shadow-sm">
      {isLoading || isSwitching ? (
        <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" aria-hidden="true" />
      ) : (
        <Building2 className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
      )}
      <Select
        className="h-7 border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-0"
        value={pendingBranchId}
        onChange={(event) => onSelectBranch(event.target.value)}
        disabled={isLoading}
        aria-label="Selecionar filial"
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}{branch.isHeadquarters ? ' (Matriz)' : ''}
          </option>
        ))}
      </Select>
    </label>
  );
}
