import { apiClient } from '../api-client';

export type EntryItem = {
  id: string;
  documentNumber: string;
  description: string;
  amount: string;
  dueDate: string;
  status: string;
  categoryName: string;
  contactName: string | null;
};

export type EntryFilters = {
  page?: number;
  pageSize?: number;
};

export const entriesApi = {
  list(filters: EntryFilters = {}) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    return apiClient.request<EntryItem[]>(`/entries?page=${page}&pageSize=${pageSize}`);
  },
};
