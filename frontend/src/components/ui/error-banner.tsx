export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#f1b9a8] bg-[#fff4ef] p-4 text-[#8c2d12]">
      <p className="text-sm font-semibold">Falha ao carregar dados</p>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry ? (
        <button
          className="mt-3 rounded-lg bg-[#8c2d12] px-3 py-2 text-xs font-semibold text-white"
          onClick={onRetry}
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
