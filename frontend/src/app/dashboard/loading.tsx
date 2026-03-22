export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
      <div className="skeleton h-[240px] w-full" />
    </div>
  );
}
