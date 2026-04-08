'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Branch } from '@/features/entries/types/entry.types';
import { ApiError } from '@/lib/api-types';
import { queryClient } from '@/lib/query-client';

interface BranchContextValue {
  activeBranch: Branch | null;
  activeBranchId: string | null;
  branches: Branch[];
  switchBranch: (branchId: string) => Promise<void>;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextValue | null>(null);

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const entry = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));

  return entry ? decodeURIComponent(entry.split('=')[1] ?? '') : null;
}

function setCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; samesite=lax`;
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeBranchId, setActiveBranchId] = useState<string | null>(() => {
    const id = getCookie('branch_id');
    return id || null;
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.branches.my,
    queryFn: ({ signal }) => api.get<Branch[]>('/branches/my', {}, { signal }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const branches = useMemo(() => data?.data ?? [], [data?.data]);

  const isOnboardingRequired = useMemo(() => {
    if (isError && error instanceof ApiError) {
      return error.status === 400 || error.status === 404;
    }

    return !isLoading && !isError && branches.length === 0;
  }, [branches.length, error, isError, isLoading]);

  const switchBranch = useCallback(async (branchId: string) => {
    if (!branchId || branchId === activeBranchId) return;

    await queryClient.cancelQueries();

    queryClient.removeQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && activeBranchId !== null && key.includes(activeBranchId);
      },
    });

    void queryClient.invalidateQueries();

    setCookie('branch_id', branchId);
    setActiveBranchId(branchId);
  }, [activeBranchId]);

  useEffect(() => {
    if (isOnboardingRequired && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [isOnboardingRequired, pathname, router]);

  useEffect(() => {
    if (branches.length === 0) return;

    const persisted = branches.find((branch) => branch.id === activeBranchId);
    if (persisted) return;

    const headquarters = branches.find((branch) => branch.isHeadquarters);
    void switchBranch((headquarters ?? branches[0]!).id);
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
