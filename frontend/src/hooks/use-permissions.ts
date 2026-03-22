'use client';

import { usePermissionContext } from '@/providers/permission-provider';

export function usePermissions() {
  const { hasPermission, hasAnyPermission, isAdmin, permissions, isLoading } = usePermissionContext();

  return { hasPermission, hasAnyPermission, isAdmin, permissions, isLoading };
}
