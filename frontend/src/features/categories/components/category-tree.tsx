'use client';

import type { Category } from '@/features/categories/types/category.types';

function TypeBadge({ type }: { type: Category['type'] }) {
  if (type === 'PAYABLE') {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}
      >
        Despesa
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: 'var(--success-muted)', color: 'var(--success)' }}
    >
      Receita
    </span>
  );
}

function CategoryNode({ category }: { category: Category }) {
  return (
    <li key={category.id} className="surface-card p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {category.name}
        </span>
        <TypeBadge type={category.type} />
      </div>
      {category.children?.length ? (
        <ul className="mt-2 space-y-2">
          {category.children.map((child) => (
            <CategoryNode key={child.id} category={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CategoryTree({ categories }: { categories: Category[] }) {
  const receitas = categories.filter((category) => category.type === 'RECEIVABLE');
  const despesas = categories.filter((category) => category.type === 'PAYABLE');

  return (
    <div className="space-y-4">
      {receitas.length ? (
        <section>
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Receitas
          </p>
          <ul className="space-y-2">
            {receitas.map((category) => (
              <CategoryNode key={category.id} category={category} />
            ))}
          </ul>
        </section>
      ) : null}

      {despesas.length ? (
        <section>
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Despesas
          </p>
          <ul className="space-y-2">
            {despesas.map((category) => (
              <CategoryNode key={category.id} category={category} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
