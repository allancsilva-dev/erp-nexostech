import { PageHeader } from '@/components/layout/page-header';

export default function CategoriasPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Categorias" subtitle="Arvore de categorias de receita e despesa" />
      <div className="rounded-xl border bg-white p-6 dark:bg-slate-800">Arvore hierarquica com CRUD e reordenacao.</div>
    </div>
  );
}
