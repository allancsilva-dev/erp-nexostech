'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CategoryForm() {
  const [name, setName] = useState('');

  return (
    <form className="grid gap-3 rounded-xl border bg-white p-4 dark:bg-slate-800 md:grid-cols-3">
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da categoria" />
      <select className="h-10 rounded-md border border-slate-300 px-3 text-sm">
        <option value="DESPESA">Despesa</option>
        <option value="RECEITA">Receita</option>
      </select>
      <Button type="button">Salvar categoria</Button>
    </form>
  );
}
