import type { ApiErrorPayload, ApiResponse } from './types';

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.details = payload.details;
  }
}

function getBranchIdFromStorage(): string {
  if (typeof window === 'undefined') return 'branch-matriz';
  return window.localStorage.getItem('active_branch_id') ?? 'branch-matriz';
}

class ApiClient {
  private readonly baseUrl = '/api/v1';

  async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const branchId = getBranchIdFromStorage();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Branch-Id': branchId,
        ...(options?.headers ?? {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error: ApiErrorPayload };
      throw new ApiError(payload.error);
    }

    if (response.status === 204) {
      return { data: undefined as T };
    }

    return (await response.json()) as ApiResponse<T>;
  }
}

export const apiClient = new ApiClient();
