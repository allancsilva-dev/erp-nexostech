'use client';

import type React from 'react';

export function DatePicker({
  value,
  onChange,
  min,
  max,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      style={{ colorScheme: 'var(--date-color-scheme)' as React.CSSProperties['colorScheme'] }}
      className={`${className ?? ''} flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm bg-[var(--bg-input)] text-[var(--text-input)] placeholder:text-[var(--placeholder-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50`}
    />
  );
}