'use client';

import { useAuthContext } from '@/providers/auth-provider';

export function usePermissions() {
  const { hasPermission, hasAnyPermission, isAdmin } = useAuthContext();

  return { hasPermission, hasAnyPermission, isAdmin: isAdmin() };
}
