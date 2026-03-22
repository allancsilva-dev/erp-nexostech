import { PageHeader } from '@/components/layout/page-header';
import { CategoryForm } from '@/features/categories/components/category-form';
import { CategoryTree } from '@/features/categories/components/category-tree';

export default function CategoriasPage() {
  return (
    <div>
      <PageHeader title="Categorias" subtitle="Plano de contas da filial" />
      <div className="mb-4 surface-card p-5">
        <CategoryForm />
      </div>
      <div className="surface-card p-5">
        <CategoryTree categories={[]} />
      </div>
    </div>
  );
}
