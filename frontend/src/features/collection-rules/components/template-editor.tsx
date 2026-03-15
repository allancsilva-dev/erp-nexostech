'use client';

import { Input } from '@/components/ui/input';

export function TemplateEditor() {
  return (
    <div className="space-y-3 rounded-xl border bg-white p-4 dark:bg-slate-800">
      <Input placeholder="Assunto do e-mail" />
      <textarea
        className="min-h-40 w-full rounded-md border border-slate-300 p-3 text-sm"
        placeholder="HTML do template com variaveis"
      />
    </div>
  );
}
