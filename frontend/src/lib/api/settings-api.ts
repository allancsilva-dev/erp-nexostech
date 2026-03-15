import { apiClient } from '../api-client';

export type FinancialSettings = {
  closingDay: number;
  currency: string;
  alertDaysBefore: number;
  emailAlerts: boolean;
  maxRefundDaysPayable: number;
  maxRefundDaysReceivable: number;
};

export const settingsApi = {
  get() {
    return apiClient.request<FinancialSettings>('/settings');
  },
  update(dto: FinancialSettings) {
    return apiClient.request<FinancialSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },
};
