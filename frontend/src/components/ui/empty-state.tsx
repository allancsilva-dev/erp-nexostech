export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#c6cab8] bg-[#f7f8f2] p-10 text-center">
      <p className="text-sm font-semibold text-[#4b4f3d]">{message}</p>
    </div>
  );
}
