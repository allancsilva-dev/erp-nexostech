export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-2xl border border-[#d7d9cf] bg-white p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-lg bg-[#eceee6]" />
      ))}
    </div>
  );
}
