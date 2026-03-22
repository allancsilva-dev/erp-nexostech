'use client';

import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMe, fetchMyPermissions } from '@/lib/api/auth';
import { queryKeys } from '@/lib/query-keys';

interface PermissionContextValue {
  permissions: string[];
  isAdmin: boolean;
  isLoading: boolean;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: fetchMe,
    staleTime: 300_000,
  });

  const { data: permissions = [], isLoading: isLoadingPermissions } = useQuery({
    queryKey: queryKeys.permissions.me,
    queryFn: fetchMyPermissions,
    staleTime: 300_000,
  });

  const isAdmin = useMemo(() => {
    return (
      me?.roles?.some(
        (role) => role.isSystem && role.name.toLowerCase() === 'admin',
      ) ?? false
    );
  }, [me?.roles]);

  const value = useMemo<PermissionContextValue>(() => {
    const hasPermission = (code: string) => isAdmin || permissions.includes(code);
    const hasAnyPermission = (codes: string[]) => isAdmin || codes.some((code) => permissions.includes(code));

    return {
      permissions,
      isAdmin,
      isLoading: isLoadingMe || isLoadingPermissions,
      hasPermission,
      hasAnyPermission,
    };
  }, [isAdmin, isLoadingMe, isLoadingPermissions, permissions]);

  return (
    <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
  );
}

export function usePermissionContext(): PermissionContextValue {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error('usePermissionContext must be used within PermissionProvider');
  }

  return context;
}
