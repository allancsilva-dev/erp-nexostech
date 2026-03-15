'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const BRANCHES = [
  { id: 'branch-matriz', name: 'Matriz' },
  { id: 'branch-centro', name: 'Loja Centro' },
  { id: 'branch-shopping', name: 'Loja Shopping' },
];

export function BranchSwitcher() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState('branch-matriz');

  useEffect(() => {
    const stored = window.localStorage.getItem('active_branch_id');
    if (stored) setSelected(stored);
  }, []);

  return (
    <select
      value={selected}
      onChange={(event) => {
        const next = event.target.value;
        setSelected(next);
        window.localStorage.setItem('active_branch_id', next);
        queryClient.invalidateQueries();
      }}
      className="rounded-xl border border-[#d1d4c7] bg-white px-3 py-2 text-xs font-semibold text-[#34392b]"
    >
      {BRANCHES.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </select>
  );
}
