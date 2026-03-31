'use client';

import { useState, useEffect } from 'react';

interface DocumentInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function formatDocument(digits: string): string {
  const d = digits.replace(/\D/g, '');

  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return d
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function DocumentInput({ value, onChange, disabled, placeholder }: DocumentInputProps) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (value) {
      setDisplay(formatDocument(value));
    } else {
      setDisplay('');
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');
    const limited = raw.slice(0, 14);
    setDisplay(formatDocument(limited));
    onChange(limited);
  }

  function handleBlur() {
    const digits = (display || '').replace(/\D/g, '');
    setDisplay(formatDocument(digits));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder ?? "CPF ou CNPJ"}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}
