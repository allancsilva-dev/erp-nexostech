import { api } from '@/lib/api-client';
import type { LockPeriod } from '@/features/settings/types/settings.types';

export async function fetchLockPeriods(branchId: string): Promise<LockPeriod[]> {
  void branchId;
  const response = await api.get<LockPeriod[]>('/lock-periods');
  return response.data;
}
