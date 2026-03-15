export type AuthUser = {
  sub: string;
  tenantId: string;
  roles: string[];
  plan: string;
  aud: string;
  email?: string;
};
