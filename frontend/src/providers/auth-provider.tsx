'use client';

import { createContext, useContext } from 'react';
import type { AuthUser } from '@/lib/jwt';

const AuthContext = createContext<AuthUser | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={initialUser}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthUser | null {
  return useContext(AuthContext);
}
