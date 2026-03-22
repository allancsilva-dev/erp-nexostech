export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--danger)]/25 bg-[var(--danger)]/10 p-4 text-[var(--danger)]">
      <p className="text-sm font-semibold">Falha ao carregar dados</p>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry ? (
        <button
          className="mt-3 rounded-lg bg-[var(--danger)] px-3 py-2 text-xs font-semibold text-[var(--bg-surface)]"
          onClick={onRetry}
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
