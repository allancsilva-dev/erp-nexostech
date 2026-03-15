export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  data: T;
  meta?: PaginationMeta;
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
};
