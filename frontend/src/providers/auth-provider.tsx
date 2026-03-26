'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://auth.zonadev.tech';
const APP_AUD = process.env.NEXT_PUBLIC_APP_AUDIENCE ?? 'erp.zonadev.tech';

export type AuthRole = {
  id: string;
  name: string;
  isSystem: boolean;
};

export type AuthUserProfile = {
  id: string;
  email: string | null;
  tenantId: string;
  roles: AuthRole[];
  active: boolean;
};

type AuthContextValue = {
  user: AuthUserProfile | null;
  permissions: string[];
  branches: Array<{ id: string; name: string }>;
  loading: boolean;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  isAdmin: () => boolean;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/users/me', { credentials: 'include' });

      if (response.status === 401) {
        // Let middleware handle redirects. Clear local state and surface the condition.
        console.error('AuthProvider: /users/me returned 401');
        setUser(null);
        setPermissions([]);
        setBranches([]);
        return;
      }

      if (response.status === 403) {
        setUser(null);
        setPermissions([]);
        setBranches([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`/users/me failed: ${response.status}`);
      }

      const body = (await response.json()) as {
        data?: {
          user: AuthUserProfile;
          permissions: string[];
          branches: Array<{ id: string; name: string }>;
        };
      };

      const data = body.data;
      setUser(data?.user ?? null);
      setPermissions(data?.permissions ?? []);
      setBranches(data?.branches ?? []);
    } catch (err) {
      console.error('AuthProvider: loadUser failed', err);
      setUser(null);
      setPermissions([]);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const hasPermission = useCallback(
    (code: string) => {
      if (!user) {
        return false;
      }

      if (
        user.roles.some(
          (role) => role.isSystem && role.name.toLowerCase() === 'admin',
        )
      ) {
        return true;
      }

      return permissions.includes(code);
    },
    [permissions, user],
  );

  const hasAnyPermission = useCallback(
    (codes: string[]) => codes.some((code) => hasPermission(code)),
    [hasPermission],
  );

  const isAdmin = useCallback(
    () =>
      user?.roles.some(
        (role) => role.isSystem && role.name.toLowerCase() === 'admin',
      ) ?? false,
    [user],
  );

  const logout = useCallback(async () => {
    const APP_URL =
      process.env.NEXT_PUBLIC_APP_URL || 'https://erp.zonadev.tech';
    const AUTH_URL =
      process.env.NEXT_PUBLIC_AUTH_URL || 'https://auth.zonadev.tech';
    const returnTo = encodeURIComponent(`${APP_URL}/login`);

    try {
      await fetch('/api/auth/local-logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      window.location.href = `${AUTH_URL}/logout?post_logout_redirect_uri=${returnTo}`;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissions,
      branches,
      loading,
      hasPermission,
      hasAnyPermission,
      isAdmin,
      logout,
      reload: loadUser,
    }),
    [
      branches,
      hasAnyPermission,
      hasPermission,
      isAdmin,
      loadUser,
      loading,
      logout,
      permissions,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }

  return context;
}
