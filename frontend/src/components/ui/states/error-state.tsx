import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--danger)]/25 bg-[var(--danger)]/10 p-4 text-[var(--danger)] md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Falha ao carregar dados</p>
          <p className="text-sm">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry} aria-label="Tentar novamente">
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
