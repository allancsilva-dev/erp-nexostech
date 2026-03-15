'use client';

import InputMask from 'react-input-mask';

export function PhoneInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <InputMask
      mask="(99) 99999-9999"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
    />
  );
}
