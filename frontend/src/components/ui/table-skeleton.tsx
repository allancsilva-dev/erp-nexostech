export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-lg bg-[var(--bg-surface-hover)]" />
      ))}
    </div>
  );
}
