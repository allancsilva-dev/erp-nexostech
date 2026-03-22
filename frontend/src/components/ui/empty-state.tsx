export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] p-10 text-center">
      <p className="text-sm font-semibold text-[var(--text-secondary)]">{message}</p>
    </div>
  );
}
