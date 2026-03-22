import { cookies } from 'next/headers';
import { ApiError } from '@/lib/api-types';
import { redirect } from 'next/navigation';

const BASE_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1';
const COOKIE_NAME = 'access_token';

export async function serverFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const branchId = cookieStore.get('branch_id')?.value;

  if (!token) {
    redirect('https://auth.zonadev.tech/login?aud=erp.zonadev.tech&redirect_uri=https://erp.zonadev.tech/dashboard');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(branchId ? { 'X-Branch-Id': branchId } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (response.status === 401) {
    redirect('https://auth.zonadev.tech/login?aud=erp.zonadev.tech&redirect_uri=https://erp.zonadev.tech/dashboard');
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

  return response.json();
}
