export interface NormalizedCashflowPoint {
  month: string;
  actualInflow: number;
  actualOutflow: number;
  forecastInflow: number;
  forecastOutflow: number;
}

export function normalizeCashflowData(raw: unknown[]): NormalizedCashflowPoint[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((point) => {
    const safePoint = (point ?? {}) as Record<string, unknown>;

    return {
      month: String(safePoint.month ?? safePoint.label ?? ''),
      actualInflow: toNumber(safePoint.actualInflow as string | number | null | undefined)
        || toNumber(safePoint.actual_inflow as string | number | null | undefined),
      actualOutflow: toNumber(safePoint.actualOutflow as string | number | null | undefined)
        || toNumber(safePoint.actual_outflow as string | number | null | undefined),
      forecastInflow: toNumber(safePoint.forecastInflow as string | number | null | undefined)
        || toNumber(safePoint.forecast_inflow as string | number | null | undefined),
      forecastOutflow: toNumber(safePoint.forecastOutflow as string | number | null | undefined)
        || toNumber(safePoint.forecast_outflow as string | number | null | undefined),
    };
  });
}

export function toNumber(value: string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }

  return typeof value === 'string' ? Number.parseFloat(value) || 0 : value;
}
