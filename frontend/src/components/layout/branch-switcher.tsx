'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Loader2 } from 'lucide-react';
import { useBranch } from '@/hooks/use-branch';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';

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
      <div className="inline-flex min-w-[220px] items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[var(--text-primary)]">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" aria-hidden="true" />
        <span className="text-[var(--text-muted)]">Carregando...</span>
      </div>
    );
  }

  if (branchList.length === 0) {
    return (
      <div className="inline-flex min-w-[220px] items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[var(--text-primary)]">
        <Building2 className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
        <span className="text-[var(--text-muted)]">Sem filiais</span>
      </div>
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
    <Dropdown
      align="left"
      trigger={(
        <button
          type="button"
          className="inline-flex min-w-[220px] items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-hover)]"
          aria-label="Selecionar filial"
          disabled={isLoading || branchList.length === 1}
        >
          {isLoading || isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" aria-hidden="true" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
          )}
          <span className="truncate">{currentBranch?.name ?? branchList[0]?.name ?? 'Matriz'}</span>
          <ChevronDown className="h-4 w-4 opacity-60" aria-hidden="true" />
        </button>
      )}
      contentClassName="w-56 border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      className="min-w-[220px]"
    >
      {branchList.length > 1
        ? branchList.map((branch) => (
            <DropdownItem
              key={branch.id}
              onClick={() => onSelectBranch(branch.id)}
              className="flex cursor-pointer items-center justify-between text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
            >
              <span className="truncate">{branch.name}</span>
              {branch.id === (currentBranch?.id ?? pendingBranchId) ? <span>✓</span> : null}
            </DropdownItem>
          ))
        : null}
    </Dropdown>
  );
}
