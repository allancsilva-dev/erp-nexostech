'use client';

import { useQueryState } from 'nuqs';
import { Input } from '@/components/ui/input';

export function EntryFilters() {
  const [search, setSearch] = useQueryState('search', { defaultValue: '' });

  return (
    <div className="surface-card p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Buscar por descricao, contato ou documento"
          value={search}
          onChange={(event) => setSearch(event.target.value || null)}
        />
      </div>
    </div>
  );
}
