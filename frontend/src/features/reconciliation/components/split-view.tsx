'use client';

export function SplitView() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border bg-white p-4 dark:bg-slate-800">Extrato bancario</div>
      <div className="rounded-xl border bg-white p-4 dark:bg-slate-800">Lancamentos ERP</div>
    </div>
  );
}
