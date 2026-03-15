'use client';

import { usePermissions } from '@/hooks/use-permissions';

export function PermissionGate({
  permission,
  fallback = null,
  children,
}: {
  permission: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { hasAnyPermission, hasPermission } = usePermissions();
  const allowed = Array.isArray(permission)
    ? hasAnyPermission(permission)
    : hasPermission(permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
