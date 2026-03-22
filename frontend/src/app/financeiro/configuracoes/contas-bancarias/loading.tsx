export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="skeleton mb-2 h-6 w-40" />
          <div className="skeleton h-4 w-52" />
        </div>
      </div>
      <div className="surface-card p-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <div className="skeleton h-4 w-4 rounded-full" />
            <div className="skeleton h-4 flex-1" />
            <div className="skeleton h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
