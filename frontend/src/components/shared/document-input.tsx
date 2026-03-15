'use client';

import InputMask from 'react-input-mask';

export function DocumentInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const mask = value.replace(/\D/g, '').length > 11 ? '99.999.999/9999-99' : '999.999.999-99';

  return (
    <InputMask
      mask={mask}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
    />
  );
}
