'use client';

import { useId } from 'react';
import InputMask from 'react-input-mask';
import { cn } from '@/lib/utils';

export const MASKS = {
  phone: '(99) 99999-9999',
  phoneLandline: '(99) 9999-9999',
  cpf: '999.999.999-99',
  cnpj: '99.999.999/9999-99',
  cep: '99999-999',
} as const;

type MaskType = keyof typeof MASKS;

interface MaskedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'children'> {
  maskType: MaskType;
  value: string;
  onChange: (rawValue: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

function toMaskedValue(rawValue: string, maskType: MaskType): string {
  const digits = rawValue.replace(/\D/g, '');
  const pattern = MASKS[maskType];
  let digitIndex = 0;
  let output = '';

  for (const char of pattern) {
    if (char === '9') {
      if (digitIndex >= digits.length) {
        break;
      }
      output += digits[digitIndex];
      digitIndex += 1;
      continue;
    }

    if (digitIndex === 0 && digits.length === 0) {
      break;
    }

    output += char;
  }

  return output;
}

export function MaskedInput({
  maskType,
  value,
  onChange,
  label,
  error,
  hint,
  required,
  className,
  id: externalId,
  ...props
}: MaskedInputProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
          {required ? (
            <span style={{ color: 'var(--danger)' }} aria-hidden>
              {' '}
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <InputMask
        id={inputId}
        mask={MASKS[maskType]}
        maskChar={null}
        value={toMaskedValue(value, maskType)}
        onChange={(event) => {
          const raw = event.target.value.replace(/\D/g, '');
          onChange(raw);
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          'w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-input)] placeholder:text-[var(--placeholder-input)] outline-none transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
          error && 'border-[var(--danger)]',
          className,
        )}
        {...props}
      />

      {error ? (
        <span id={`${inputId}-error`} className="text-xs" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </span>
      ) : null}

      {hint && !error ? (
        <span id={`${inputId}-hint`} className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}