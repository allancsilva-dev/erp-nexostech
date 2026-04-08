import { type ApiResponse, type PaginatedResponse } from '@/lib/api-types';
import { ApiError } from './api-error';
import { httpFetch } from '@/lib/http-client';

const API_BASE = '/api/v1';
let rateLimitRemaining: number | null = null;
let throttleUntil = 0;

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
};

// Opções de negócio separadas do RequestInit — não vazar branchId para a camada HTTP
type RequestOptions = {
  signal?: AbortSignal;
  branchId?: string;
  idempotencyKey?: string;
};

function normalizeRequestOptions(options?: string | RequestOptions): RequestOptions | undefined {
  if (typeof options === 'string') {
    return { idempotencyKey: options };
  }

  return options;
}

const TENANT_LEVEL_ENDPOINTS = ['/contacts', '/branches', '/roles', '/users', '/tenants', '/notifications'];

function isTenantLevelEndpoint(endpoint: string): boolean {
  return TENANT_LEVEL_ENDPOINTS.some((prefix) => endpoint.startsWith(prefix));
}

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.split('=')[1];

  return value ? decodeURIComponent(value) : null;
}

function cleanParams(params: Record<string, unknown>): Record<string, string> {
  return Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') return acc;
    acc[key] = String(value);
    return acc;
  }, {});
}

class ApiClient {
  private readonly baseUrl = API_BASE;

  private async request<T>(
    endpoint: string,
    options?: RequestOptions & Omit<RequestInit, 'signal'>,
  ): Promise<T> {
    if (throttleUntil > Date.now()) {
      const delay = throttleUntil - Date.now();
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Parâmetro explícito tem prioridade — cookie é apenas fallback
    const branchId = options?.branchId ?? getCookieValue('branch_id');

    const isFormDataBody = typeof FormData !== 'undefined' && options?.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
      ...(branchId && !isTenantLevelEndpoint(endpoint) ? { 'X-Branch-Id': branchId } : {}),
      ...(options?.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    };

    const response = await httpFetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      signal: options?.signal,
      headers: {
        ...headers,
        ...(options?.headers as Record<string, string> | undefined),
      },
    });

    const remainingHeader = response.headers.get('X-RateLimit-Remaining');
    if (remainingHeader !== null) {
      const parsedRemaining = Number.parseInt(remainingHeader, 10);
      if (!Number.isNaN(parsedRemaining)) {
        rateLimitRemaining = parsedRemaining;
        if (parsedRemaining < 5) throttleUntil = Date.now() + 5000;
        else if (parsedRemaining < 10) throttleUntil = Date.now() + 2000;
      }
    }

    if (response.status === 204) return undefined as T;

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 60_000;
      throttleUntil = Date.now() + (Number.isNaN(waitMs) ? 60_000 : waitMs);
      throw new ApiError('RATE_LIMIT', 'Limite de requisicoes atingido. Aguarde alguns segundos.', undefined, 429);
    }

    if (response.status === 401) {
      throw new ApiError('AUTH_UNAUTHORIZED', 'Sessao expirada', undefined, 401);
    }

    if (!response.ok) {
      let errorData: ApiErrorPayload | null;
      try {
        errorData = await response.json();
      } catch {
        throw new ApiError(
          'INTERNAL_ERROR',
          'Erro interno do sistema. Nossa equipe foi notificada',
          undefined,
          undefined,
          response.status,
        );
      }

      if (errorData?.error?.code) {
        throw new ApiError(
          errorData.error.code,
          errorData.error.message ?? 'Erro inesperado. Tente novamente ou contate o suporte',
          errorData.error.details,
          errorData.error.requestId,
          response.status,
        );
      }

      throw new ApiError(
        'INTERNAL_ERROR',
        'Erro inesperado. Tente novamente ou contate o suporte',
        { raw: errorData },
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }

  public get<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    const query = params ? `?${new URLSearchParams(cleanParams(params)).toString()}` : '';
    return this.request<ApiResponse<T>>(`${endpoint}${query}`, options);
  }

  public getList<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<PaginatedResponse<T>> {
    const query = params ? `?${new URLSearchParams(cleanParams(params)).toString()}` : '';
    return this.request<PaginatedResponse<T>>(`${endpoint}${query}`, options);
  }

  public post<T>(
    endpoint: string,
    body?: unknown,
    options?: string | RequestOptions,
  ): Promise<ApiResponse<T>> {
    const normalizedOptions = normalizeRequestOptions(options);

    return this.request<ApiResponse<T>>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...normalizedOptions,
    });
  }

  public postForm<T>(
    endpoint: string,
    body: FormData,
    options?: string | RequestOptions,
  ): Promise<ApiResponse<T>> {
    const normalizedOptions = normalizeRequestOptions(options);

    return this.request<ApiResponse<T>>(endpoint, {
      method: 'POST',
      body,
      ...normalizedOptions,
    });
  }

  public put<T>(
    endpoint: string,
    body: unknown,
    options?: string | RequestOptions,
  ): Promise<ApiResponse<T>> {
    const normalizedOptions = normalizeRequestOptions(options);

    return this.request<ApiResponse<T>>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...normalizedOptions,
    });
  }

  public patch<T>(
    endpoint: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    });
  }

  public delete(endpoint: string, options?: RequestOptions): Promise<void> {
    return this.request<void>(endpoint, { method: 'DELETE', ...options });
  }
}

export const api = new ApiClient();

export function getRateLimitStatus(): { remaining: number | null; isThrottled: boolean } {
  return {
    remaining: rateLimitRemaining,
    isThrottled: throttleUntil > Date.now(),
  };
}