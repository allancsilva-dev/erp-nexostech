export interface UserRole {
  id: string;
  name: string;
  isSystem?: boolean;
}

export interface UserMe {
  id: string;
  email: string;
  name?: string;
  tenantId: string;
  roles: UserRole[];
  plan?: string;
}

export interface MyPermissionsResponse {
  permissions: string[];
}
