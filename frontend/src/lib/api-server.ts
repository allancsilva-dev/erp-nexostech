import { cookies } from 'next/headers';
import { ApiError } from '@/lib/api-types';

const BASE_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1';

export async function serverFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  const branchId = cookieStore.get('branch_id')?.value;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Cookie: `access_token=${token}` } : {}),
      ...(branchId ? { 'X-Branch-Id': branchId } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? 'Erro na API',
      body?.error?.details,
      response.status,
    );
  }

  return response.json();
}
