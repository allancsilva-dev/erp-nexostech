'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export function CategoryForm() {
  const [name, setName] = useState('');
  const [type, setType] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE');

  return (
    <form className="grid gap-3 md:grid-cols-3">
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da categoria" />
      <Select
        value={type}
        onChange={(event) => setType(event.target.value as 'PAYABLE' | 'RECEIVABLE')}
      >
        <option value="PAYABLE">Despesa</option>
        <option value="RECEIVABLE">Receita</option>
      </Select>
      <div className="flex items-center gap-2">
        <Button type="button" variant="primary">Salvar categoria</Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setName('');
            setType('PAYABLE');
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
