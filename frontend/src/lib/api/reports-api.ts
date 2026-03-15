import { apiClient } from '../api-client';

export type DreResponse = {
  revenueTotal: string;
  expenseTotal: string;
  netResult: string;
};

export const reportsApi = {
  dre(startDate: string, endDate: string) {
    return apiClient.request<DreResponse>(`/reports/dre?startDate=${startDate}&endDate=${endDate}`);
  },
  cashflow(startDate: string, endDate: string) {
    return apiClient.request(`/reports/cashflow?startDate=${startDate}&endDate=${endDate}`);
  },
};
