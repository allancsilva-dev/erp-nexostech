'use client';

import { MaskedInput } from '@/components/ui/masked-input';

interface DocumentInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DocumentInput({ value, onChange, disabled }: DocumentInputProps) {
  const digits = (value || '').replace(/\D/g, '');
  const maskType = digits.length > 11 ? 'cnpj' : 'cpf';

  return (
    <MaskedInput
      maskType={maskType}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={maskType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
    />
  );
}
