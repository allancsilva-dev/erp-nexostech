import { api } from '@/lib/api-client';
import type { LockPeriod } from '@/features/settings/types/settings.types';

export async function fetchLockPeriods(
  branchId: string,
  signal?: AbortSignal,
): Promise<LockPeriod[]> {
  const response = await api.get<LockPeriod[]>('/lock-periods', {}, {
    signal,
    branchId,
  });
  return response.data;
}
