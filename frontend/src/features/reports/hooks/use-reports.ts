'use client';

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { queryKeys } from '@/lib/query-keys';
import type {
  AgingReport,
  BalanceSheetReport,
  CashflowReport,
  DreReport,
  ExportReportPayload,
  ReportExportResponse,
  ReportFilters,
} from '@/features/reports/types/report.types';

const REPORT_STALE_TIME_MS = 60_000;

function hasValidPeriod(filters: ReportFilters): boolean {
  return Boolean(filters.startDate && filters.endDate);
}

export function useDreReport(filters: ReportFilters) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.reports.dre(activeBranchId || 'default', filters),
    queryFn: () => api.get<DreReport>('/reports/dre', filters),
    enabled: Boolean(activeBranchId) && hasValidPeriod(filters),
    staleTime: REPORT_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useBalanceSheetReport(filters: ReportFilters) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.reports.balanceSheet(activeBranchId || 'default', filters),
    queryFn: () => api.get<BalanceSheetReport>('/reports/balance-sheet', filters),
    enabled: Boolean(activeBranchId) && hasValidPeriod(filters),
    staleTime: REPORT_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useAgingReport(filters: ReportFilters) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: queryKeys.reports.aging(activeBranchId || 'default', filters),
    queryFn: () => api.get<AgingReport>('/reports/aging', filters),
    enabled: Boolean(activeBranchId) && hasValidPeriod(filters),
    staleTime: REPORT_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useCashflowReport(filters: ReportFilters) {
  const { activeBranchId } = useBranch();

  return useQuery({
    queryKey: ['reports', activeBranchId || 'default', 'cashflow', JSON.stringify(filters)] as const,
    queryFn: () => api.get<CashflowReport>('/reports/cashflow', filters),
    enabled: Boolean(activeBranchId) && hasValidPeriod(filters),
    staleTime: REPORT_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: async (payload: ExportReportPayload) => {
      const response = await api.get<ReportExportResponse>('/reports/export', payload);
      return response.data;
    },
  });
}

export function useReports() {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const filters: ReportFilters = { startDate, endDate };

  const dre = useDreReport(filters);
  const balanceSheet = useBalanceSheetReport(filters);
  const aging = useAgingReport(filters);
  const cashflow = useCashflowReport(filters);

  return { dre, balanceSheet, aging, cashflow };
}
