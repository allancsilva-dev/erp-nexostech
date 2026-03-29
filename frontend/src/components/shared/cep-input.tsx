'use client';

import { MaskedInput } from '@/components/ui/masked-input';

interface CepInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CepInput({ value, onChange, disabled }: CepInputProps) {
  return (
    <MaskedInput
      maskType="cep"
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="00000-000"
    />
  );
}
