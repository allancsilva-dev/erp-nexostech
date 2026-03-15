import { PageHeader } from '@/components/layout/page-header';
import { CategoryForm } from '@/features/categories/components/category-form';
import { CategoryTree } from '@/features/categories/components/category-tree';

export default function CategoriasPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Categorias" subtitle="Estrutura hierarquica de receitas e despesas" />
      <CategoryForm />
      <CategoryTree categories={[]} />
    </div>
  );
}
