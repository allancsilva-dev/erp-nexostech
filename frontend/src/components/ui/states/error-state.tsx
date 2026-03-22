import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/70 dark:bg-red-900/20 dark:text-red-300 md:flex-row md:items-center md:justify-between">
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
