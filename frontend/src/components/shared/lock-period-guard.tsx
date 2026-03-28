'use client';

import type { ReactNode } from 'react';
import { formatDate } from '@/lib/format';
import { useLockPeriods } from '@/hooks/use-lock-periods';
import type { LockPeriod } from '@/features/settings/types/settings.types';

function resolveLockedUntil(period: LockPeriod): string | null {
  const candidate =
    (period as LockPeriod & { lockedUntil?: string; locked_until?: string }).lockedUntil ??
    (period as LockPeriod & { lockedUntil?: string; locked_until?: string }).locked_until ??
    period.endDate;

  return candidate ?? null;
}

export function checkLockPeriod(periods: LockPeriod[], date?: string): {
  isLocked: boolean;
  lockedUntil: string | null;
  message: string | null;
} {
  if (!date) {
    return { isLocked: false, lockedUntil: null, message: null };
  }

  const operationDate = new Date(date);
  if (Number.isNaN(operationDate.getTime())) {
    return { isLocked: false, lockedUntil: null, message: null };
  }

  const blockingLockedUntil = periods
    .map(resolveLockedUntil)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .find((lockedUntil) => operationDate <= new Date(lockedUntil));

  if (!blockingLockedUntil) {
    return { isLocked: false, lockedUntil: null, message: null };
  }

  return {
    isLocked: true,
    lockedUntil: blockingLockedUntil,
    message: `Período contábil fechado até ${formatDate(blockingLockedUntil)}`,
  };
}

export function useLockPeriodCheck(date?: string): {
  isLocked: boolean;
  lockedUntil: string | null;
  message: string | null;
} {
  const lockPeriodsQuery = useLockPeriods();

  if (lockPeriodsQuery.isLoading || lockPeriodsQuery.isError) {
    return { isLocked: false, lockedUntil: null, message: null };
  }

  const periods = lockPeriodsQuery.data ?? [];
  return checkLockPeriod(periods, date);
}

export function LockPeriodGuard({
  date,
  children,
  fallback,
}: {
  date?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const lockCheck = useLockPeriodCheck(date);

  if (!date) {
    return <>{children}</>;
  }

  const { isLocked, message } = lockCheck;

  if (!isLocked || !message) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <span className="inline-flex cursor-not-allowed opacity-60" title={message} aria-label={message}>
      <span className="pointer-events-none">{children}</span>
    </span>
  );
}
