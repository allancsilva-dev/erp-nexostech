import { toast } from 'sonner';
import { ApiError } from '@/lib/api-error';
import { mapApiError } from '@/lib/error-mapper';

export function showApiError(error: ApiError): void {
  const mapped = mapApiError(error);

  console.error({
    code: error.code,
    message: error.message,
    details: error.details,
    requestId: error.requestId,
    action: mapped.action,
  });

  toast.error(mapped.message, {
    description: mapped.action,
    duration: 6000,
  });
}

export function showNetworkError(): void {
  console.error({ code: 'INTERNAL_TIMEOUT', message: 'Erro de rede' });
  toast.error('Erro de conexao. Verifique sua internet e tente novamente', {
    duration: 6000,
  });
}

export function showUnknownError(error: unknown): void {
  if (error instanceof ApiError) {
    showApiError(error);
    return;
  }

  showNetworkError();
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return mapApiError(error).message;
  }

  return fallback;
}