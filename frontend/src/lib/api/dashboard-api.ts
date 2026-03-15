import { apiClient } from '../api-client';

export type DashboardSummary = {
  currentBalance: string;
  totalReceivable30d: string;
  totalPayable30d: string;
  monthResult: string;
};

export const dashboardApi = {
  summary() {
    return apiClient.request<DashboardSummary>('/dashboard/summary');
  },
};
