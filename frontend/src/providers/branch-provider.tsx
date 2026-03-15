'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Branch } from '@/features/entries/types/entry.types';

interface BranchContextValue {
  activeBranch: Branch | null;
  activeBranchId: string;
  branches: Branch[];
  switchBranch: (branchId: string) => void;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextValue | null>(null);

function getCookie(name: string): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const entry = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));

  return entry ? decodeURIComponent(entry.split('=')[1]) : '';
}

function setCookie(name: string, value: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; samesite=lax`;
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [activeBranchId, setActiveBranchId] = useState<string>(() => getCookie('branch_id'));

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.branches.my,
    queryFn: () => api.get<Branch[]>('/branches/my'),
  });

  const branches = useMemo(() => data?.data ?? [], [data?.data]);

  const switchBranch = useCallback((branchId: string) => {
    setCookie('branch_id', branchId);
    setActiveBranchId(branchId);
  }, []);

  useEffect(() => {
    if (!activeBranchId && branches.length > 0) {
      switchBranch(branches[0].id);
    }
  }, [activeBranchId, branches, switchBranch]);

  const activeBranch = useMemo(
    () => branches.find((branch) => branch.id === activeBranchId) ?? null,
    [activeBranchId, branches],
  );

  const value = useMemo(
    () => ({ activeBranch, activeBranchId, branches, switchBranch, isLoading }),
    [activeBranch, activeBranchId, branches, switchBranch, isLoading],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranchContext(): BranchContextValue {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranchContext must be used within BranchProvider');
  }
  return context;
}
