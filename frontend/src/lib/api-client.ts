import { ApiError, type ApiResponse, type PaginatedResponse } from '@/lib/api-types';

const API_BASE = '/api/v1';
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://auth.zonadev.tech/login';
let rateLimitRemaining: number | null = null;
let throttleUntil = 0;

const TENANT_LEVEL_ENDPOINTS = ['/contacts', '/branches', '/roles', '/users', '/tenants'];

function isTenantLevelEndpoint(endpoint: string): boolean {
  return TENANT_LEVEL_ENDPOINTS.some((prefix) => endpoint.startsWith(prefix));
}

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
  private readonly baseUrl = API_BASE;

  private async request<T>(
    endpoint: string,
    options?: RequestInit & { idempotencyKey?: string },
  ): Promise<T> {
    if (throttleUntil > Date.now()) {
      const delay = throttleUntil - Date.now();
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const branchId = getCookieValue('branch_id');

    const isFormDataBody = typeof FormData !== 'undefined' && options?.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
      ...(branchId && !isTenantLevelEndpoint(endpoint) ? { 'X-Branch-Id': branchId } : {}),
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

    const remainingHeader = response.headers.get('X-RateLimit-Remaining');
    if (remainingHeader !== null) {
      const parsedRemaining = Number.parseInt(remainingHeader, 10);
      if (!Number.isNaN(parsedRemaining)) {
        rateLimitRemaining = parsedRemaining;

        if (parsedRemaining < 5) {
          throttleUntil = Date.now() + 5000;
        } else if (parsedRemaining < 10) {
          throttleUntil = Date.now() + 2000;
        }
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 60_000;
      throttleUntil = Date.now() + (Number.isNaN(waitMs) ? 60_000 : waitMs);
      throw new ApiError('RATE_LIMIT', 'Limite de requisicoes atingido. Aguarde alguns segundos.', undefined, 429);
    }

    if (response.status === 401 && typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      window.location.href = `${AUTH_URL}?app=erp.zonadev.tech&redirect=${encodeURIComponent(currentUrl)}`;
      throw new ApiError('UNAUTHORIZED', 'Sessao expirada', undefined, 401);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new ApiError(
        body?.error?.code ?? body?.code ?? 'UNKNOWN',
        body?.error?.message ?? body?.message ?? 'Erro na API',
        body?.error?.details ?? body?.details,
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

  public postForm<T>(endpoint: string, body: FormData, idempotencyKey?: string): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: 'POST',
      body,
      idempotencyKey,
    });
  }

  public put<T>(endpoint: string, body: unknown, idempotencyKey?: string): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      idempotencyKey,
    });
  }

  public patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  public delete(endpoint: string): Promise<void> {
    return this.request<void>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

export function getRateLimitStatus(): { remaining: number | null; isThrottled: boolean } {
  return {
    remaining: rateLimitRemaining,
    isThrottled: throttleUntil > Date.now(),
  };
}
