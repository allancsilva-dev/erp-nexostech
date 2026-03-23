'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { useBranch } from '@/hooks/use-branch';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api-client';

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function toAttachmentList(value: unknown): Attachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Attachment => {
    if (typeof item !== 'object' || !item) {
      return false;
    }

    const candidate = item as Partial<Attachment>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.filename === 'string' &&
      typeof candidate.mimeType === 'string' &&
      (typeof candidate.sizeBytes === 'number' || typeof candidate.sizeBytes === 'string') &&
      typeof candidate.createdAt === 'string'
    );
  }).map((item) => ({
    ...item,
    sizeBytes: Number(item.sizeBytes),
  }));
}

function formatBytes(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${Math.max(size / 1024, 0.1).toFixed(1)} KB`;
}

function getTypeLabel(mimeType: string): string {
  if (mimeType === 'application/pdf') {
    return 'PDF';
  }

  if (mimeType.startsWith('image/')) {
    return 'IMG';
  }

  return 'ARQ';
}

export function AttachmentsList({ entryId }: { entryId: string }) {
  const { activeBranchId } = useBranch();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const canDelete = hasPermission('financial.entries.delete');

  const attachmentsQuery = useQuery({
    queryKey: ['entries', entryId, 'attachments', activeBranchId] as const,
    queryFn: async () => {
      const response = await api.get<{ attachments?: unknown[] }>(`/entries/${entryId}`);
      return toAttachmentList(response.data.attachments);
    },
    enabled: Boolean(entryId && activeBranchId),
  });

  const removeMutation = useMutation({
    mutationFn: (attachmentId: string) => api.delete(`/attachments/${attachmentId}`),
    onSuccess: () => {
      toast.success('Anexo removido com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['entries', entryId, 'attachments', activeBranchId] });
      void queryClient.invalidateQueries({ queryKey: ['entries', activeBranchId, 'detail', entryId] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Erro inesperado. Tente novamente.');
      toast.error(message);
      console.error('[attachments:remove]', error);
    },
  });

  if (attachmentsQuery.isLoading) {
    return <TableSkeleton rows={3} cols={4} />;
  }

  if (attachmentsQuery.isError) {
    return <ErrorBanner message={getErrorMessage(attachmentsQuery.error, 'Erro inesperado. Tente novamente.')} onRetry={() => void attachmentsQuery.refetch()} />;
  }

  const items = attachmentsQuery.data ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        title="Sem anexos"
        description="Nenhum anexo foi retornado para este lancamento no endpoint atual."
      />
    );
  }

  function handleRemove(attachment: Attachment): void {
    if (!canDelete) {
      return;
    }

    const approved = window.confirm(`Remover anexo ${attachment.filename}?`);
    if (!approved) {
      return;
    }

    removeMutation.mutate(attachment.id);
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white p-3 dark:bg-slate-800">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left dark:bg-slate-900/60">
            <th className="px-3 py-2 font-medium">Tipo</th>
            <th className="px-3 py-2 font-medium">Nome</th>
            <th className="px-3 py-2 font-medium">Tamanho</th>
            <th className="px-3 py-2 font-medium">Upload</th>
            <th className="px-3 py-2 font-medium">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((attachment) => (
            <tr key={attachment.id} className="border-b">
              <td className="px-3 py-2">{getTypeLabel(attachment.mimeType)}</td>
              <td className="px-3 py-2">{attachment.filename}</td>
              <td className="px-3 py-2">{formatBytes(attachment.sizeBytes)}</td>
              <td className="px-3 py-2">{new Date(attachment.createdAt).toLocaleDateString('pt-BR')}</td>
              <td className="px-3 py-2">
                {canDelete ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(attachment)}
                    disabled={removeMutation.isPending}
                  >
                    {removeMutation.isPending ? 'Processando...' : 'Remover'}
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500">Sem permissao</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
