export interface NormalizedCashflowPoint {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export function normalizeCashflowData(raw: unknown[]): NormalizedCashflowPoint[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((point) => {
    const safePoint = (point ?? {}) as Record<string, unknown>;

    return {
      month: String(safePoint.month ?? safePoint.date ?? ''),
      income: toNumber(safePoint.income as string | number | null | undefined)
        || toNumber(safePoint.totalIn as string | number | null | undefined),
      expense: toNumber(safePoint.expense as string | number | null | undefined)
        || toNumber(safePoint.totalOut as string | number | null | undefined),
      balance: toNumber(safePoint.balance as string | number | null | undefined),
    };
  });
}

export function toNumber(value: string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }

  return typeof value === 'string' ? Number.parseFloat(value) || 0 : value;
}
