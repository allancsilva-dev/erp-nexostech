export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

export const PLAN_FEATURES: Record<PlanTier, Record<string, boolean>> = {
  STARTER: {
    boletos_enabled: false,
    approval_flow_enabled: false,
    branches_enabled: false,
    collection_rules_enabled: false,
    api_access_enabled: false,
  },
  PRO: {
    boletos_enabled: true,
    approval_flow_enabled: true,
    branches_enabled: true,
    collection_rules_enabled: true,
    api_access_enabled: false,
  },
  ENTERPRISE: {
    boletos_enabled: true,
    approval_flow_enabled: true,
    branches_enabled: true,
    collection_rules_enabled: true,
    api_access_enabled: true,
  },
};

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
  plan?: PlanTier;
}

export interface MyPermissionsResponse {
  permissions: string[];
}
