'use client';

import type { ReactNode } from 'react';
import { formatDate } from '@/lib/format';
import { useLockPeriods } from '@/hooks/use-lock-periods';
import type { LockPeriod } from '@/features/settings/types/settings.types';

function findBlockingPeriod(periods: LockPeriod[], operationDate: Date): LockPeriod | null {
  return (
    periods.find((period) => {
      const endDate = new Date(period.endDate);
      return operationDate <= endDate;
    }) ?? null
  );
}

export function LockPeriodGuard({
  date,
  children,
  fallback,
}: {
  date: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const lockPeriodsQuery = useLockPeriods();

  if (lockPeriodsQuery.isLoading || lockPeriodsQuery.isError) {
    return <>{children}</>;
  }

  const periods = lockPeriodsQuery.data?.data ?? [];
  const blockingPeriod = findBlockingPeriod(periods, new Date(date));

  if (!blockingPeriod) {
    return <>{children}</>;
  }

  const message = `Periodo contabil fechado ate ${formatDate(blockingPeriod.endDate)}`;

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <span className="inline-flex cursor-not-allowed opacity-60" title={message} aria-label={message}>
      <span className="pointer-events-none">{children}</span>
    </span>
  );
}
