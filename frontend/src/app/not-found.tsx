import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-semibold">Pagina nao encontrada</h1>
      <p className="text-slate-600">A rota informada nao existe.</p>
      <Link className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white" href="/dashboard">
        Voltar ao dashboard
      </Link>
    </div>
  );
}
