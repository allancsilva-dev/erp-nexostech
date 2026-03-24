'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/format';

interface FieldChange {
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  old_value?: unknown;
  new_value?: unknown;
  [key: string]: unknown;
}

export interface AuditLogDetailItem {
  id: string;
  branchId: string | null;
  userId: string;
  userEmail?: string | null;
  action: string;
  entity: string;
  entityId: string;
  requestId: string | null;
  ipAddress?: string | null;
  fieldChanges?: unknown[];
  createdAt: string;
}

function toFieldChanges(value: unknown[] | undefined): FieldChange[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is FieldChange => typeof item === 'object' && item !== null);
}

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function AuditLogDetail({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: AuditLogDetailItem | null;
  onClose: () => void;
}) {
  if (!item) {
    return null;
  }

  const changes = toFieldChanges(item.fieldChanges);

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhe do log de auditoria</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <p><strong>Acao:</strong> {item.action}</p>
            <p><strong>Entidade:</strong> {item.entity}</p>
            <p><strong>Usuario:</strong> {item.userEmail ?? item.userId}</p>
            <p><strong>Data:</strong> {formatDateTime(item.createdAt)}</p>
            <p><strong>IP:</strong> {item.ipAddress ?? '-'}</p>
            <p><strong>Request ID:</strong> {item.requestId ?? '-'}</p>
          </div>

          <div>
            <p className="mb-2 font-semibold">Alteracoes de campos</p>
            {changes.length === 0 ? (
              <p className="text-slate-500">Nenhuma alteracao de campo registrada.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[620px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left bg-[var(--bg-surface-raised)]">
                      <th className="px-3 py-2 font-medium">Campo</th>
                      <th className="px-3 py-2 font-medium">Valor anterior</th>
                      <th className="px-3 py-2 font-medium">Valor novo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((change, index) => (
                      <tr key={`${item.id}-${index}`} className="border-b">
                        <td className="px-3 py-2">{toDisplayValue(change.field ?? change.key ?? '-')}</td>
                        <td className="px-3 py-2">{toDisplayValue(change.oldValue ?? change.old_value ?? '-')}</td>
                        <td className="px-3 py-2">{toDisplayValue(change.newValue ?? change.new_value ?? '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
