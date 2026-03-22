'use client';

import { usePermissionContext } from '@/providers/permission-provider';

export function usePermissions() {
  const { user, hasPermission, hasAnyPermission, isAdmin, permissions, isLoading } = usePermissionContext();

  return {
    user,
    hasPermission,
    hasAnyPermission,
    isAdmin: isAdmin(),
    permissions,
    isLoading,
  };
}
