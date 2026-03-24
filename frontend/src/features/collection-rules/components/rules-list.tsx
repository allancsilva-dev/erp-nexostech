'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { useCollectionRules } from '@/features/collection-rules/hooks/use-collection-rules';
import { api } from '@/lib/api-client';
import { useState } from 'react';
import { toast } from 'sonner';

interface RuleItem {
  id: string;
  name?: string;
  channel?: string;
  active?: boolean;
}

function toRulesList(value: unknown): RuleItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is RuleItem => {
    if (typeof item !== 'object' || !item || !('id' in item)) {
      return false;
    }
    return typeof (item as { id: unknown }).id === 'string';
  });
}

export function RulesList() {
  const rules = useCollectionRules();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (rules.isLoading) {
    return <TableSkeleton rows={6} cols={4} />;
  }

  if (rules.isError) {
    return <ErrorBanner message={rules.error.message} onRetry={() => rules.refetch()} />;
  }

  const list = toRulesList(rules.data?.data);

  async function handleDelete(ruleId: string): Promise<void> {
    const confirmed = window.confirm('Remover esta regra de cobranca?');
    if (!confirmed) {
      return;
    }

    setDeletingId(ruleId);
    try {
      await api.delete(`/collection-rules/${ruleId}`);
      await rules.refetch();
      toast.success('Regra removida.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao remover regra.';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  if (list.length === 0) {
    return <EmptyState title="Nenhuma regra cadastrada" description="Crie regras para automatizar cobrancas." />;
  }

  return (
    <div className="surface-card overflow-x-auto p-3">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-left bg-[var(--bg-surface-raised)]">
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Nome</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Canal</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Status</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {list.map((rule) => (
            <tr key={rule.id} className="border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
              <td className="px-3 py-2">{rule.name ?? rule.id}</td>
              <td className="px-3 py-2">{rule.channel ?? '-'}</td>
              <td className="px-3 py-2">{rule.active ? 'Ativa' : 'Inativa'}</td>
              <td className="px-3 py-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void handleDelete(rule.id)} disabled={deletingId === rule.id}>
                  {deletingId === rule.id ? 'Removendo...' : 'Excluir'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
