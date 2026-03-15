'use client';

export function DatePicker({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
    />
  );
}
