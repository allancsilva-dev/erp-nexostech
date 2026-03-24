'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { useBranch } from '@/hooks/use-branch';
import { Select } from '@/components/ui/select';

export function BranchSwitcher() {
  const { activeBranch, branches, switchBranch, isLoading } = useBranch();
  const branchList = branches as typeof branches | undefined;
  const currentBranch = activeBranch ?? branchList?.[0] ?? null;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingBranchId, setPendingBranchId] = useState(currentBranch?.id ?? '');
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    setPendingBranchId(currentBranch?.id ?? '');
  }, [currentBranch?.id]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!branchList) {
    return (
      <label className="flex min-w-[220px] items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" aria-hidden="true" />
        <button
          type="button"
          disabled
          className="h-7 w-full cursor-not-allowed rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] px-2 text-left text-[var(--text-muted)]"
          aria-label="Carregando filiais"
        >
          ...
        </button>
      </label>
    );
  }

  if (branchList.length === 0) {
    return (
      <label className="flex min-w-[220px] items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm shadow-sm">
        <Building2 className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
        <button
          type="button"
          disabled
          className="h-7 w-full cursor-not-allowed rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] px-2 text-left text-[var(--text-muted)]"
          aria-label="Sem filiais"
        >
          Sem filiais
        </button>
      </label>
    );
  }

  if (branchList.length === 1) {
    return (
      <label className="flex min-w-[220px] items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm shadow-sm">
        <Building2 className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
        <span className="truncate text-[var(--text-default)]">
          {currentBranch?.name ?? branchList[0].name}
        </span>
      </label>
    );
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
        {branchList.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}{branch.isHeadquarters ? ' (Matriz)' : ''}
          </option>
        ))}
      </Select>
    </label>
  );
}
