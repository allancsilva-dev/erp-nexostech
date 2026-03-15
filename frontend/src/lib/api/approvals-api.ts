import { apiClient } from '../api-client';

export type PendingApproval = {
  id: string;
  entryId: string;
  amount: string;
  description?: string;
  createdAt?: string;
};

export const approvalsApi = {
  listPending() {
    return apiClient.request<PendingApproval[]>('/approvals/pending');
  },
  approve(entryId: string) {
    return apiClient.request(`/approvals/${entryId}/approve`, { method: 'POST' });
  },
  reject(entryId: string, reason: string) {
    return apiClient.request(`/approvals/${entryId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
