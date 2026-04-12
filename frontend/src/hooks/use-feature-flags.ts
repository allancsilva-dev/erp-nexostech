'use client';

import { useAuthContext } from '@/providers/auth-provider';

const PLAN_FLAGS: Record<string, Record<string, boolean>> = {
  STARTER: {
    boletos_enabled: false,
    approval_flow_enabled: false,
    branches_enabled: false,
    collection_rules_enabled: false,
  },
  PRO: {
    boletos_enabled: true,
    approval_flow_enabled: true,
    branches_enabled: true,
    collection_rules_enabled: true,
  },
  ENTERPRISE: {
    boletos_enabled: true,
    approval_flow_enabled: true,
    branches_enabled: true,
    collection_rules_enabled: true,
  },
};

export function useFeatureFlags(): Record<string, boolean> {
  const { user } = useAuthContext();

  return PLAN_FLAGS[user?.plan ?? 'STARTER'] ?? PLAN_FLAGS.STARTER;
}

export function useFeatureFlag(flag: string): boolean {
  const flags = useFeatureFlags();

  return flags[flag] ?? false;
}
