import { ApiError, type ApiResponse, type PaginatedResponse } from '@/lib/api-types';

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const value = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.split('=')[1];

  return value ? decodeURIComponent(value) : null;
}

function cleanParams(params: Record<string, unknown>): Record<string, string> {
  return Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return acc;
    }
    acc[key] = String(value);
    return acc;
  }, {});
}

class ApiClient {
  private readonly baseUrl = '/api/v1';

  private async request<T>(
    endpoint: string,
    options?: RequestInit & { idempotencyKey?: string },
  ): Promise<T> {
    const branchId = getCookieValue('branch_id');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(branchId ? { 'X-Branch-Id': branchId } : {}),
      ...(options?.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...(options?.headers as Record<string, string> | undefined),
      },
      credentials: 'include',
    });

    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new ApiError(
        body?.error?.code ?? 'UNKNOWN',
        body?.error?.message ?? 'Erro na API',
        body?.error?.details,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }

  public get<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const query = params ? `?${new URLSearchParams(cleanParams(params)).toString()}` : '';
    return this.request<ApiResponse<T>>(`${endpoint}${query}`);
  }

  public getList<T>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<T>> {
    const query = params ? `?${new URLSearchParams(cleanParams(params)).toString()}` : '';
    return this.request<PaginatedResponse<T>>(`${endpoint}${query}`);
  }

  public post<T>(endpoint: string, body?: unknown, idempotencyKey?: string): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      idempotencyKey,
    });
  }

  public put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  public delete(endpoint: string): Promise<void> {
    return this.request<void>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
