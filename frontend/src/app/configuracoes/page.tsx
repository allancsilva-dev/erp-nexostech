'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/utils';
import { CategoryForm } from '@/features/categories/components/category-form';
import { CategoryTree } from '@/features/categories/components/category-tree';
import { useCategories } from '@/features/categories/hooks/use-categories';
import type { Category } from '@/features/categories/types/category.types';
import { UsuariosView } from '@/features/users/components/usuarios-view';
import { RolesManager } from '@/features/settings/components/roles-manager';
import { BranchManager } from '@/features/settings/components/branch-manager';
import { FinancialSettings } from '@/features/settings/components/financial-settings';
import { BankAccountsCrud } from '@/features/settings/components/bank-accounts-crud';
import { ApprovalRulesManager } from '@/features/settings/components/approval-rules-manager';
import { LockPeriodForm } from '@/features/settings/components/lock-period-form';

const TABS = [
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'usuarios', label: 'Usuários' },
  { key: 'permissoes', label: 'Permissões' },
  { key: 'filiais', label: 'Filiais' },
];

function buildCategoryTree(categories: Category[]) {
  const map = new Map<string, Category>();
  const roots: Category[] = [];

  categories.forEach((category) => {
    map.set(category.id, { ...category, children: [] });
  });

  categories.forEach((category) => {
    const node = map.get(category.id);
    if (!node) return;

    if (category.parentId && map.has(category.parentId)) {
      const parent = map.get(category.parentId);
      parent?.children?.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
}

export default function ConfiguracoesPage() {
  const STORAGE_KEY = 'settings_active_tab';
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved && TABS.some((t) => t.key === saved)) return saved;
    } catch {
      // ignore
    }

    return 'financeiro';
  });

  const categories = useCategories();
  const categoryTree = buildCategoryTree(categories.data?.data ?? []);
  const [financeTab, setFinanceTab] = useState<'geral' | 'contas' | 'aprovacoes' | 'periodo' | 'categorias'>('geral');

  return (
    <div>
      <PageHeader title="Configurações" subtitle="" />

      <div className="mt-4">
        <div className="flex gap-2 border-b border-[var(--border-default)]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                try {
                  localStorage.setItem(STORAGE_KEY, tab.key);
                } catch {
                  // ignore
                }
              }}
              className={cn(
                'px-4 py-2 text-sm',
                activeTab === tab.key
                  ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {activeTab === 'financeiro' && (
            <div className="mt-4">
              <div className="flex gap-2 border-b border-[var(--border-default)]">
                <button
                  onClick={() => setFinanceTab('geral')}
                  className={cn(
                    'px-3 py-2 text-sm',
                    financeTab === 'geral' ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  Geral
                </button>

                <button
                  onClick={() => setFinanceTab('contas')}
                  className={cn(
                    'px-3 py-2 text-sm',
                    financeTab === 'contas' ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  Contas bancárias
                </button>

                <button
                  onClick={() => setFinanceTab('aprovacoes')}
                  className={cn(
                    'px-3 py-2 text-sm',
                    financeTab === 'aprovacoes' ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  Aprovações
                </button>

                <button
                  onClick={() => setFinanceTab('periodo')}
                  className={cn(
                    'px-3 py-2 text-sm',
                    financeTab === 'periodo' ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  Período
                </button>

                <button
                  onClick={() => setFinanceTab('categorias')}
                  className={cn(
                    'px-3 py-2 text-sm',
                    financeTab === 'categorias' ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  Categorias
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {financeTab === 'geral' && (
                  <div className="surface-card p-5">
                    <h3 className="text-base font-semibold">Geral</h3>
                    <div className="mt-3">
                      <FinancialSettings />
                    </div>
                  </div>
                )}

                {financeTab === 'contas' && (
                  <div className="surface-card p-5">
                    <h3 className="text-base font-semibold">Contas bancárias</h3>
                    <div className="mt-3">
                      <BankAccountsCrud />
                    </div>
                  </div>
                )}

                {financeTab === 'aprovacoes' && (
                  <div className="surface-card p-5">
                    <h3 className="text-base font-semibold">Regras de aprovação</h3>
                    <div className="mt-3">
                      <ApprovalRulesManager />
                    </div>
                  </div>
                )}

                {financeTab === 'periodo' && (
                  <div className="surface-card p-5">
                    <h3 className="text-base font-semibold">Bloqueio contábil</h3>
                    <div className="mt-3">
                      <LockPeriodForm />
                    </div>
                  </div>
                )}

                {financeTab === 'categorias' && (
                  <div className="surface-card p-5">
                    <h3 className="text-base font-semibold">Categorias</h3>
                    <div className="mb-4 mt-2">
                      <CategoryForm />
                    </div>
                    <div>
                      {categories.isLoading ? (
                        <p className="text-sm text-[var(--text-secondary)]">Carregando categorias...</p>
                      ) : categoryTree.length === 0 ? (
                        <p className="text-sm text-[var(--text-secondary)]">Ainda não há categorias cadastradas.</p>
                      ) : (
                        <CategoryTree categories={categoryTree} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div className="mt-4">
              <div className="surface-card p-5">
                <h3 className="text-base font-semibold">Usuários</h3>
                <div className="mt-2">
                  <UsuariosView showHeader={false} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissoes' && (
            <div className="surface-card p-5">
              <RolesManager />
            </div>
          )}

          {activeTab === 'filiais' && (
            <div className="surface-card p-5">
              <BranchManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

