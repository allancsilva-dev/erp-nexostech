'use client';

import Decimal from 'decimal.js';
import { NumericFormat } from 'react-number-format';

export function CurrencyInput({
  value,
  onChange,
  placeholder,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <NumericFormat
      id={id}
      thousandSeparator="."
      decimalSeparator=","
      prefix="R$ "
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      value={value ? new Decimal(value).toNumber() : ''}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={(e) => e.target.select()}
      onValueChange={(values) => {
        if (values.floatValue === undefined || values.floatValue === null) {
          onChange('');
          return;
        }
        onChange(values.floatValue.toFixed(2));
      }}
      className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm bg-[var(--bg-input)] text-[var(--text-input)] placeholder:text-[var(--placeholder-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}