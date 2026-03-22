import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export function MoneyDisplay({
  value,
  colored = false,
  className,
}: {
  value: string;
  colored?: boolean;
  className?: string;
}) {
  const negative = value.startsWith('-');

  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        colored ? (negative ? 'text-[var(--danger)]' : 'text-[var(--success)]') : '',
        className,
      )}
    >
      {formatCurrency(value)}
    </span>
  );
}
