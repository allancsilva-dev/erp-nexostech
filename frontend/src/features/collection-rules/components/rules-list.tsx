'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { useCollectionRules } from '@/features/collection-rules/hooks/use-collection-rules';

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

  if (rules.isLoading) {
    return <TableSkeleton rows={6} cols={4} />;
  }

  if (rules.isError) {
    return <ErrorBanner message={rules.error.message} onRetry={() => rules.refetch()} />;
  }

  const list = toRulesList(rules.data?.data);

  if (list.length === 0) {
    return <EmptyState title="Nenhuma regra cadastrada" description="Crie regras para automatizar cobrancas." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white p-3 dark:bg-slate-800">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left dark:bg-slate-900/60">
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Nome</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Canal</th>
            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Status</th>
          </tr>
        </thead>
        <tbody>
          {list.map((rule) => (
            <tr key={rule.id} className="border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
              <td className="px-3 py-2">{rule.name ?? rule.id}</td>
              <td className="px-3 py-2">{rule.channel ?? '-'}</td>
              <td className="px-3 py-2">{rule.active ? 'Ativa' : 'Inativa'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
