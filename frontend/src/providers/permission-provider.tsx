'use client';

import { createContext, useContext } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import type { PlanTier } from '@/lib/types/auth';

interface PermissionContextValue {
  user: (Record<string, unknown> & { plan?: PlanTier }) | null;
  permissions: string[];
  isLoading: boolean;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  isAdmin: () => boolean;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { permissions, loading, user, hasPermission, hasAnyPermission, isAdmin } = useAuthContext();

  return (
    <PermissionContext.Provider
      value={{ permissions, isLoading: loading, user, hasPermission, hasAnyPermission, isAdmin }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext(): PermissionContextValue {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error('usePermissionContext must be used within PermissionProvider');
  }

  return context;
}
