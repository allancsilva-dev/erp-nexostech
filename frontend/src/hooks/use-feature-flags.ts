'use client';

import { PLAN_FEATURES, type PlanTier } from '@/lib/types/auth';
import { usePermissions } from '@/hooks/use-permissions';

export function useFeatureFlag(flag: string): boolean {
  const { user } = usePermissions();
  const plan = (user?.plan || 'STARTER') as PlanTier;

  return PLAN_FEATURES[plan]?.[flag] ?? false;
}
