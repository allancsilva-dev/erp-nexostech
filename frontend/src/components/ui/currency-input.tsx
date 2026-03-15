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
      className="w-full rounded-xl border border-[#d3d8c5] bg-white px-3 py-2 text-sm"
      onValueChange={(values) => {
        const decimal = values.floatValue ?? 0;
        onChange(decimal.toFixed(2));
      }}
    />
  );
}
