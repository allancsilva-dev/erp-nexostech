'use client';

import { NumericFormat } from 'react-number-format';

export function CurrencyInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <NumericFormat
      value={value}
      thousandSeparator="."
      decimalSeparator="," 
      prefix="R$ "
      decimalScale={2}
      fixedDecimalScale
      className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-input)] placeholder:text-[var(--placeholder-input)]"
      onValueChange={(values) => {
        const decimal = values.floatValue ?? 0;
        onChange(decimal.toFixed(2));
      }}
    />
  );
}
