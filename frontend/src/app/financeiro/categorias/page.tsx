'use client';

import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/states';
import { CategoryForm } from '@/features/categories/components/category-form';
import { CategoryTree } from '@/features/categories/components/category-tree';
import { useCategories } from '@/features/categories/hooks/use-categories';
import type { Category } from '@/features/categories/types/category.types';

function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];

  categories.forEach((category) => {
    map.set(category.id, { ...category, children: [] });
  });

  categories.forEach((category) => {
    const node = map.get(category.id);
    if (!node) {
      return;
    }

    if (category.parentId && map.has(category.parentId)) {
      const parent = map.get(category.parentId);
      parent?.children?.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
}

export default function CategoriasPage() {
  const categories = useCategories();
  const categoryTree = buildCategoryTree(categories.data?.data ?? []);

  return (
    <div>
      <PageHeader title="Categorias" subtitle="Plano de contas da filial" />
      <div className="mb-4 surface-card p-5">
        <CategoryForm />
      </div>
      <div className="surface-card p-5">
        {categories.isLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Carregando categorias...
          </p>
        ) : categoryTree.length === 0 ? (
          <EmptyState title="Sem categorias" description="Ainda não há categorias cadastradas." />
        ) : (
          <CategoryTree categories={categoryTree} />
        )}
      </div>
    </div>
  );
}
