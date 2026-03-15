'use client';

import Decimal from 'decimal.js';
import { NumericFormat } from 'react-number-format';

export function CurrencyInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <NumericFormat
      thousandSeparator="."
      decimalSeparator="," 
      prefix="R$ "
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      value={value ? new Decimal(value).toNumber() : ''}
      placeholder={placeholder}
      disabled={disabled}
      onValueChange={(values) => {
        if (values.floatValue === undefined || values.floatValue === null) {
          onChange('');
          return;
        }
        onChange(values.floatValue.toFixed(2));
      }}
      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
    />
  );
}
