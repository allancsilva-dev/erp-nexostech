import { decodeJwt } from 'jose';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
  plan: string;
}

export function decodeToken(token: string): AuthUser | null {
  try {
    const payload = decodeJwt(token);
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    if (!payload.exp) {
      return false;
    }
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
