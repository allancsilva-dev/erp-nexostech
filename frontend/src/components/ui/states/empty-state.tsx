import { Inbox } from 'lucide-react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center">
      <Inbox className="h-8 w-8 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h3>
      <p className="max-w-md text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
      {action}
    </div>
  );
}
