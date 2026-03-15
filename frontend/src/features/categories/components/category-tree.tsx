'use client';

import type { Category } from '@/features/categories/types/category.types';

export function CategoryTree({ categories }: { categories: Category[] }) {
  return (
    <ul className="space-y-2">
      {categories.map((category) => (
        <li key={category.id} className="rounded-md border bg-white p-3 dark:bg-slate-800">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{category.name}</span>
            <span className="text-slate-500">{category.type}</span>
          </div>
          {category.children?.length ? <CategoryTree categories={category.children} /> : null}
        </li>
      ))}
    </ul>
  );
}
