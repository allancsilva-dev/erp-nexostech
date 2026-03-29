'use client';

import { MaskedInput } from '@/components/ui/masked-input';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PhoneInput({ value, onChange, disabled }: PhoneInputProps) {
  return (
    <MaskedInput
      maskType="phone"
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="(00) 00000-0000"
    />
  );
}
