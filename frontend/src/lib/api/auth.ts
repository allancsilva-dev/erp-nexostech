import { api } from '@/lib/api-client';
import type { MyPermissionsResponse, UserMe } from '@/lib/types/auth';

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export async function fetchMe(): Promise<UserMe> {
  const response = await api.get<UserMe>('/users/me');
  return unwrapData<UserMe>(response);
}

export async function fetchMyPermissions(): Promise<string[]> {
  const response = await api.get<MyPermissionsResponse>('/users/me/permissions');
  const data = unwrapData<MyPermissionsResponse>(response);
  return data.permissions ?? [];
}
